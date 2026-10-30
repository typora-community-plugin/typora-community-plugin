# 工具函数与跨平台兼容层

core 导出了少量跨平台工具。它们的目标是让插件在 Windows/Linux（提供 Node.js）与 macOS（不提供 Node.js）上都能运行，而不是完整复刻 Node.js API。



## fs

`fs` 是 `FileAdapter` 实例，提供常用的异步文件操作：

```ts
import { fs } from '@typora-community-plugin/core'
```

| 方法 | 说明 |
| --- | --- |
| `access(path)` | 检查路径是否可访问；不存在时 reject。 |
| `exists(path)` | 返回路径是否存在。 |
| `stat(path)` | 返回 `{ isDirectory(), isFile(), mtimeMs, size }`。 |
| `isDirectory(path)` | 是否为目录（macOS 上比 `stat()` 更快）。 |
| `mkdir(path)` | 创建目录。 |
| `copy(src, dest)` | 复制文件。 |
| `move(src, dest)` | 移动文件。 |
| `list(dir)` | 返回目录项**名称**列表，不含路径。 |
| `listFiles(dir, { recursive?, signal? })` | 返回文件**完整路径**，可递归、可中止。 |
| `readText(path)` | 异步读取文本。 |
| `readTextSync(path)` | 同步读取文本。 |
| `writeText(path, text)` | 写入文本。 |
| `appendText(path, text)` | 追加文本。 |
| `remove(path)` | 删除文件/目录。 |
| `trash(path)` | 移入回收站。 |

```ts
const files = await fs.listFiles(vaultPath, { recursive: true })

for (const file of files) {
  if (!file.endsWith('.md')) continue
  const text = await fs.readText(file)
  // ...
}
```

> **平台差异**
>
> macOS 上 `fs` 通过 Typora 的 JSBridge 实现，`access` / `exists` / `stat` / `mkdir` / `copy` / `move` / `list` / `writeText` / `appendText` 等操作可能非常慢（约 2 秒级）。在 macOS 上应避免在渲染或滚动路径中频繁调用。
>
> `FileAdapter` 类本身没有从包入口导出，请直接使用 `fs` 实例。



## path

```ts
import { path } from '@typora-community-plugin/core'
```

类型上只保证以下成员：

| 成员 | 说明 |
| --- | --- |
| `sep` | 路径分隔符。 |
| `isAbsolute(path)` | 是否为绝对路径。 |
| `basename(path, suffix?)` | 文件名；可去掉指定后缀。 |
| `extname(path)` | 扩展名（点号开头）。 |
| `dirname(path)` | 父目录。 |
| `join(...paths)` | 拼接路径并处理 `.` / `..`。 |
| `relative(from, to)` | 计算相对路径。 |

```ts
path.join(vaultPath, 'notes', 'a.md')
path.dirname('/vault/notes/a.md')   // '/vault/notes'
path.extname('a.b.md')              // '.md'
path.relative('/vault', '/vault/notes/a.md') // 'notes/a.md'
```

> Windows/Linux 上底层直接使用 Node.js 的 `path` 模块（运行时还有 `resolve`、`normalize` 等方法，但类型未声明）；macOS 上使用 core 的浏览器实现，只支持上表方法。为保证跨平台，请只使用上表成员。



## os

```ts
import { os } from '@typora-community-plugin/core'
```

| 方法 | 说明 |
| --- | --- |
| `arch()` | CPU 架构，如 `x64`、`arm64`。 |
| `homedir()` | 用户主目录。 |
| `hostname()` | 主机名；macOS 浏览器实现中返回 User-Agent。 |
| `platform()` | `'win32' \| 'linux' \| 'darwin'`。 |
| `type()` | `'Windows' \| 'Linux' \| 'Darwin'`。 |

> 类型上只保证上表成员。Windows/Linux 底层是 Node.js 的 `os` 模块（运行时可能还有 `EOL`、`tmpdir`、`cpus` 等，但未声明）；macOS 上为浏览器实现，`homedir()` 依赖 loader 的 `<script src="file:///Users/...">` 路径，找不到时会抛错。为保证跨平台，请只使用上表成员。



## debounce

```ts
import { debounce } from '@typora-community-plugin/core'

const onScroll = debounce(() => {
  // ...
}, 200)

const onInput = debounce(() => {
  // 立即执行一次，随后在停止输入 wait 毫秒后再执行
}, 300, true)
```

签名：`debounce(func, wait, immediate?)`。返回值同样是函数，不提供 `cancel()`。



## format

```ts
import { format } from '@typora-community-plugin/core'

format('Hello, {name}!', { name: 'Typora' }) // 'Hello, Typora!'
```

使用 `{key}` 占位符；缺少对应键时保留原样的 `{key}`。



## html

```ts
import { html } from '@typora-community-plugin/core'

const el = html`<div class="my-panel"><span>Hello</span></div>`
document.body.append(el)
```

- 基于 jQuery 创建元素，返回第一个根元素；
- 建议只使用**单个根元素**，多根元素时只会返回第一个。



## until

```ts
import { until } from '@typora-community-plugin/core'

const editorEl = await until(() => document.querySelector('#write'))
```

每隔约 352ms 轮询一次条件，直到返回真值。适合等待 Typora 的 DOM 就绪。

> 没有超时机制；条件永远不满足时 Promise 不会结束。在插件卸载时无法自动取消，长期等待时请自行加超时或状态判断。



## decorate

```ts
import { decorate } from '@typora-community-plugin/core'
```

`decorate` 来自 [`@plylrnsdy/decorate.js`](https://www.npmjs.com/package/@plylrnsdy/decorate.js)，提供 `beforeCall`、`afterCall`、`parameters`、`returnValue` 等装饰方法，用于在不修改 Typora 源码的情况下拦截函数调用。

```ts
this.register(
  decorate.returnValue(editor, 'getMarkdown', (args, markdown) => {
    return markdown.replace(/foo/g, 'bar')
  }))
```

| 方法 | 回调 | 说明 |
| --- | --- | --- |
| `decorate(obj, method, wrapper)` | `(bindedFn, fn) => fn` | 最底层装饰。 |
| `decorate.parameters(obj, method, wrapper)` | `(args) => args` | 修改调用参数。 |
| `decorate.returnValue(obj, method, wrapper)` | `(args, value) => value` | 修改返回值。 |
| `decorate.beforeCall(obj, method, listener)` | `(args) => void` | 调用前执行。 |
| `decorate.afterCall(obj, method, listener)` | `(args, value) => void` | 调用后执行，**返回值会被忽略**。 |

所有方法都返回注销函数。

> 装饰 Typora 内部函数属于非稳定用法，Typora 升级后可能失效。优先使用 core 提供的正式扩展点。
