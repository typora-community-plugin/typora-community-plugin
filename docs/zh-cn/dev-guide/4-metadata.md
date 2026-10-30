# Metadata API

Metadata API 会为笔记文件建立元数据索引，并把结果缓存在内存与 IndexedDB 中。插件可以注册 provider，为指定扩展名的文件计算自定义元数据，再按相对路径查询。

通过 `app.metadata` 访问 `MetadataManager` 实例。



## 注册 provider

```ts
import { Plugin } from '@typora-community-plugin/core'

export default class extends Plugin {
  onload() {
    this.register(
      this.app.metadata.register('md', async (ctx) => {
        const text = await ctx.text()
        const wikilinks = [...text.matchAll(/\[\[([^\]]+)\]\]/g)]
          .map(match => match[1])

        return {
          metadata: {
            wikilinks,
          },
        }
      }))
  }
}
```

- 扩展名带不带前导 `.` 都可以，内部会统一为小写。
- `register()` 返回注销函数，插件中直接 `this.register(...)`。
- provider 抛错时会被捕获并记录警告，该 provider 的结果按 `{}` 参与合并，不会中断其他 provider。
- 注册/注销 provider 会使对应扩展名的缓存失效并重新处理，避免 mtime 未变时一直使用旧结果。



## MetadataProviderContext

| 成员 | 说明 |
| --- | --- |
| `filePath` | 当前文件的绝对路径。 |
| `text()` | 读取文件文本。只读取一次，后续调用返回缓存值。 |
| `fileStats()` | 返回 `fs.stat()` 结果（`mtimeMs`、`size` 等）。 |

> `text()` 是异步的；`fileStats()` 是同步的，且在 provider 执行时已经准备好。



## 返回值与缓存结构

provider 返回一个普通对象，最终会按扩展名合并所有 provider 的结果。缓存项结构：

```ts
type CacheEntry = {
  mtime: number
  providerSignature?: string
  metadata: {
    frontmatter: Record<string, any>
    tags: Array<{ name: string, ... }>
    [key: string]: any
  }
  [key: string]: any
}
```

core 默认注册了两个 provider：

- `basicMeta`：写入 `mtime`、`size`；
- `markdown`：解析 `metadata.frontmatter`、`metadata.tags`、`metadata.titles`。

因此 Markdown 文件的典型缓存项：

```ts
{
  mtime: 1730000000000,
  size: 2048,
  providerSignature: 'abc123',
  metadata: {
    frontmatter: { title: 'Hello' },
    tags: [{ name: 'todo', lineText: '#todo', lineNumber: 3 }],
    titles: [{ name: 'Hello', lineText: '# Hello', lineNumber: 1 }],
    // 你的 provider 写入的字段
  },
}
```



## 合并策略

`register(ext, provider, { merge })` 的 `merge` 按点路径声明数组合并方式：

```ts
this.app.metadata.register('md', myProvider, {
  merge: {
    'metadata.tags': 'concatUnique',
    '*': 'concat',
  },
})
```

| 策略 | 说明 |
| --- | --- |
| `replace` | 后一个 provider 的值直接覆盖。 |
| `deep` | 普通对象递归合并。 |
| `concat` | 数组拼接。 |
| `concatUnique` | 数组去重后拼接；对象按 `name` 去重，其他值按 JSON 去重。 |

默认行为：普通对象深度合并，其他值覆盖。`'*'` 只作为数组值的回退策略。



## 查询与更新

| 方法 | 说明 |
| --- | --- |
| `index()` | 全量索引当前笔记文件夹。 |
| `get(relativePath)` | 按**相对于笔记文件夹的路径**查询缓存。 |
| `update(filePath, content?)` | 重新处理单个文件（传绝对路径）。传入 `content` 时忽略磁盘内容，按给定文本计算。 |
| `remove(filePath)` | 从缓存中移除文件或整个文件夹子树（绝对路径）。 |
| `rename(oldPath, newPath)` | 移动缓存中的文件或文件夹子树（绝对路径）。 |
| `clear()` | 清空内存缓存并关闭当前笔记文件夹的 IndexedDB 连接。 |

```ts
const entry = this.app.metadata.get('notes/hello.md')

console.log(entry?.metadata.frontmatter)
console.log(entry?.metadata.tags.map(tag => tag.name))
```

> 路径参数不一致是常见错误：`get()` 使用相对路径，`update()` / `remove()` / `rename()` 使用绝对路径。



## 事件

通过 `app.metadata.on(...)` 监听：

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `index:start` | `(total: number)` | 全量索引开始，`total` 为待处理文件数。 |
| `index:progress` | `(current: number)` | 已处理文件数。 |
| `index:done` | 无 | 全量索引完成。这是 sticky 事件，索引完成后再订阅也会立即触发。 |
| `index:update` | `(relativePath: string)` | 单个文件元数据更新。 |
| `index:remove` | `(relativePath: string)` | 单个文件元数据被移除。 |

```ts
this.register(
  this.app.metadata.on('index:done', () => {
    console.log('index ready')
  }))
```



## 全量索引

全量索引不会在插件加载时自动执行。需要建立完整索引时，显式调用：

```ts
await this.app.metadata.index()
```

core 内置的 `internal.metadata` 插件（默认关闭）会在 `app` 加载完成后自动执行一次全量索引。第三方插件不应假设索引已经存在。



## 同步机制

- 文件保存时，使用编辑器中的未保存内容重新计算；
- 文件删除、文件/文件夹重命名时同步增删缓存；
- 切换笔记文件夹时重建缓存连接；
- 与 Typora 原生 Quick Open worker 同步，保证快速打开面板中的文件也进入索引；
- 增量更新默认最多同时处理 10 个文件，避免文件描述符耗尽。

索引结果按笔记文件夹 id 存入 IndexedDB，重启后会先加载缓存，再按 mtime 与 provider 签名决定是否重新处理。



## 注意

- `index()` 是异步的。需要完整数据时 `await index()`，或监听 `index:done`。
- `get()` 只读取当前内存缓存；索引开始前或文件尚未处理时可能返回 `undefined`。
- 查询返回的是缓存引用，不要直接修改它；需要变更时通过 provider 重新计算。
- 索引会遍历整个笔记文件夹，provider 应避免高开销操作；`text()` 已经做了单次读取缓存。
