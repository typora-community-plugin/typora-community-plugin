# 统计行

Statistics API 允许插件在 Typora 的词数统计面板中注册自定义统计行。已注册的统计项会与词数、字符数和阅读时间等内置统计并排显示。

> 词数面板由 Typora 原生提供（Windows/Linux 上通常为 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>W</kbd>），不是 core 注册的命令。

> **平台限制**
>
> Statistics 依赖 Typora 特定的 DOM 结构，当前仅兼容 Windows 与 Linux，macOS 上不可用。



## 注册统计项

通过 `app.features.statistics` 访问 Statistics 实例：

### 普通统计行

```ts
import { Plugin } from '@typora-community-plugin/core'

export default class extends Plugin {
  onload() {
    this.register(
      this.app.features.statistics.registerStatistic({
        id: 'my-stat',
        name: '我的统计',
        eval(context) {
          const markdown = context.markdown
          return String(markdown.length)
        },
      }))
  }
}
```

### 选中区域统计行

```ts
this.register(
  this.app.features.statistics.registerSelectionStatistic({
    id: 'selected-lines',
    name: '选中行数',
    eval(context) {
      const lines = context.selectionText.split('\n').filter(l => l.trim()).length
      return lines > 0 ? String(lines) : null
    },
  }))
```

两种注册方法都返回注销函数，调用后会移除统计项与对应 DOM 行：

```ts
const dispose = this.app.features.statistics.registerStatistic(/* ... */)
dispose()
```

在插件中直接 `this.register(...)` 即可在卸载时自动注销。



## StatisticHandler

```ts
import type { StatisticHandler } from '@typora-community-plugin/core'

type StatisticHandler = {
  id: string
  name: string
  eval(context: StatisticContext): string | null
}
```

| 字段 | 说明 |
| --- | --- |
| `id` | 统计项标识，用作 DOM id 前缀：普通统计为 `typ-wc-{id}`，选中区域统计为 `typ-wc-sel-{id}`。 |
| `name` | 显示在统计行中的名称/单位标签。会被插入 HTML，请使用纯文本，不要传入不可信内容。 |
| `eval(context)` | 计算统计值。返回字符串时显示，返回 `null` 时隐藏该行。 |

> **注意**：普通统计与选中区域统计分别查重，同一个 `id` 可以同时注册到两个区域；但在同一区域内重复注册会直接抛错。



## StatisticContext

### `context.markdown`

```ts
get markdown(): string
```

惰性读取当前文档的 Markdown 内容，只读取一次；后续访问返回缓存值。

> 读取会经过 Markdown 前处理器的 `presave` 阶段，因此可能触发插件注册的文本替换。

### `context.selectionText`

```ts
get selectionText(): string
```

从 DOM 读取当前选中的纯文本（非 Markdown）。没有选中区域时返回空字符串。

### `context.get(id)`

```ts
get(id: string): string | null
```

按 id 读取本轮已计算的统计值，使一个统计项可以依赖另一个。

- 内置统计 id：`reading-time`、`lines`、`words`、`characters`、`selected-words`、`selected-characters`；
- 内置统计尚未计算时，会从 Typora 底部 DOM 中惰性读取；
- 其他统计未计算或已隐藏时返回 `null`。

同一区域的统计按注册顺序依次计算，并共享同一个 `context`，因此后注册的统计可以读取先注册统计的结果。

```ts
eval(context) {
  const words = Number(context.get('words') ?? 0)
  return words > 1000 ? '长文' : '短文'
}
```

### `context.set(id, value)`

```ts
set(id: string, value: string | null): void
```

把结果写入当前上下文，供后续统计通过 `get()` 读取。传入 `null` 表示隐藏或跳过。也可以使用自己的 id 或其他统计的 id。

> 每轮计算完成后，Statistics 会自动把当前统计的结果写入 `context`，通常不需要手动调用 `set()`。



## 更新时机

`eval()` 会在以下时机被调用：

- 词数面板打开时；
- 文档内容或选中区域变化、Typora 更新词数时。

更新经过 167ms 节流。面板未打开时注册也是安全的：注册项会在下次打开面板时注入。



## 例子

- core 内置测试插件 `plugin-test` 中同时注册了普通统计与选中区域统计，可在 `packages/core/src/plugin-internal/plugins/plugin-test.ts` 中查看。
