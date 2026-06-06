# Statistics API

Statistics 模块允许插件在 Typora 的词数统计面板（可通过 `Ctrl+Shift+W` 打开）中注册自定义统计行。已注册的统计项会与词数、字符数和阅读时间等内置统计并排显示。

## 注册统计项

通过 `statistics` 服务上的 `registerStatistic()` 方法添加新行：

```js
// typora-plugin-example /src/main.ts

export default class extends Plugin {
  onload() {
    
    this.app.plugins.registerStatistic({
      id: 'my-stat',
      name: '我的统计',
      eval(context) {
        const markdown = context.markdown
        // 计算你的值...
        return '42'
      }
    })
  }
}
```

插件卸载时，已注册的统计项会自动移除。

## StatisticHandler

调用 `registerStatistic()` 时需要传入一个包含以下字段的 handler 对象：

| 字段          | 类型                                              | 说明                                                                                         |
| ------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `id`          | `string`                                          | 所有已注册统计项中的唯一标识符。用作 DOM ID 前缀（`typ-wc-{id}`），不得与其他注册项冲突。    |
| `name`        | `string`                                          | 显示在统计行中的名称 / 单位标签。                                                            |
| `eval(context)` | `(context: StatisticContext) => string \| null`   | 计算该统计项的值。                                                                           |

`eval()` 方法会在词数面板打开或 Markdown 内容变化时被调用。返回非空字符串即可显示值，返回 `null` 则隐藏该行。

## StatisticContext

传递给 `eval()` 的 context 对象提供以下功能：

### `context.markdown` — 当前文档内容

```ts
get markdown(): string
set markdown(value: string)
```

惰性读取当前文档的 Markdown 内容，仅读取一次；后续访问会返回缓存值。你也可以通过 setter 覆写它来进行测试或自定义处理。

### `context.get(id)` — 跨统计值共享

```ts
get(id: string): string | null
```

按 ID 检索之前计算的统计值，使一个统计项可以依赖于另一个：

- 对于 Typora 内置底部统计（`reading-time`、`lines`、`words`、`characters`），如果不存在之前计算的值，则会回退到从原始 DOM 中惰性读取。
- 如果该统计尚未被计算或已被隐藏，则返回 `null`。

```js
eval(context) {
  const wordCount = context.get('words')
  // 使用 wordCount 进行你的计算...
}
```

### `context.set(id, value)` — 存储计算结果

```ts
set(id: string, value: string | null): void
```

将结果存储在某个统计 ID 下，以便其他统计通过 `get()` 读取。传入 `null` 表示该统计已被隐藏或跳过。可以使用你自己的唯一 ID，也可以使用另一个已注册统计的 ID。

## 平台兼容性

> **注意：** Statistics 模块仅兼容 Windows 和 Linux，因为它依赖于 Typora 特定的 DOM 结构（macOS 上有所不同）。
