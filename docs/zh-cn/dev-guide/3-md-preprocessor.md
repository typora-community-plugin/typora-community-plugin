# Markdown 前处理器

## 功能

- 渲染 Markdown 之前，使用函数替换文本；
- 读取 Markdown 之前（`preload`），把文件内容交给处理器；
- 获取 Markdown 时（`presave`），把处理器结果交给调用方。

可以用于实现自定义语法。

**注意**：可能影响大文件（1k+ 行的文件）的打开性能，请谨慎使用，并使用大文件进行测试。尽量使用 [Markdown 后处理器](./3-md-postprocessor.md) 或其他方法代替。



## 处理器结构

```ts
type TPreProcessor = {
  when: 'preload' | 'presave'
  type: 'mdtext' | 'code'
  process: (text: string) => string
}
```

| 字段 | 说明 |
| --- | --- |
| `when` | `preload`：文件内容进入编辑器前处理；`presave`：调用 `getMarkdown()` 时处理。 |
| `type` | `mdtext`：处理整段 Markdown；`code`：只处理代码块内部。 |
| `process` | 接收文本并返回替换后的文本。 |

> `presave` 并不只发生在“保存”动作：任何读取 Markdown 的调用（包括统计行中的 `context.markdown`）都会触发。



## 注册

```ts
import { Plugin } from '@typora-community-plugin/core'

export default class extends Plugin {
  onload() {
    this.registerMarkdownPreProcessor({
      when: 'preload',
      type: 'mdtext',
      process: md => md.replace(/#([^\s#]+)/g, '<i alt="$1">#$1</i>'),
    })
  }
}
```

使用 `registerMarkdownPreProcessor()` 注册后，会在插件卸载时自动移除。



## 执行顺序

1. 先屏蔽代码块（`type: 'mdtext'` 的处理器不会改写代码块内容）；
2. `preload` 时再屏蔽 HTML 标签；
3. 按注册顺序依次执行 `mdtext` 处理器；
4. 对代码块内容执行 `code` 处理器；
5. 还原 HTML 与代码块。

如果某个处理器抛错，core 会记录日志并返回 **本次处理的原始文本**，不会把错误文本写入文档。



## mdtext 与 code

- `mdtext`：适合替换自定义语法，例如把 `#tag` 替换为带属性的元素。
- `code`：只处理代码块内部，适合改写代码块中的占位符或变量。
- 代码块使用正则掩码后再处理，减少 `mdtext` 处理器误伤代码的概率，但复杂语法仍建议先自行测试。



## 例子

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag) 使用正则替换 `#tag` 为 `<i alt="tag">#tag</i>` 以支持标签
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink) 使用正则替换 `[[link]]` 为 `<a>[[link]]</a>` 以支持 wikilink
