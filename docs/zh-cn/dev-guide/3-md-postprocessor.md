# Markdown 后处理器

渲染 Markdown 之后，修改编辑器 DOM。可用于添加非文本编辑的功能，例如按钮、装饰文本、代码块预览。



## 类型

| 类 | 描述 | 例子 |
| --- | --- | --- |
| `PostProcessor` | 基础后处理器。 | - |
| `HtmlPostProcessor` | 按 CSS 选择器处理元素。 | - |
| `CodeblockPostProcessor` | 代码块后处理器。支持按钮与内容预览。 | [typora-plugin-codeblock-copy-button](https://github.com/typora-community-plugin/typora-plugin-codeblock-copy-button) |
| `DecoratedTextPostprocessor` | 装饰文本（高亮/点击）后处理器。 | [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag) |

`registerMarkdownPostProcessor()` 既可以接收处理器实例，也可以接收普通函数：

```ts
this.registerMarkdownPostProcessor(el => {
  // el 是编辑器根元素
})
```



## 公共接口

```ts
interface PostProcessorContext {
  /** 编辑器模式为 `#write`，预览模式为 `.typ-markdown-view` */
  containerEl: HTMLElement
}

interface ButtonOptions<T = any> {
  text: string
  title?: string
  className?: string
  onclick: (event: MouseEvent & { target: HTMLElement }, context: T) => void
}

class PostProcessor {
  process(el: HTMLElement, context: PostProcessorContext): void // 必须重写
  renderButton(parent: HTMLElement, button: ButtonOptions): void
  setupButtonContainer(parent: HTMLElement, position?: InsertPosition): HTMLElement
  static from(process: RawProcessor | Pick<PostProcessor, 'process'>): PostProcessor
}
```

`PostProcessor.process()` 默认直接抛错，必须自行实现。异常会被捕获并记录日志，不会中断其他处理器。



## PostProcessor

```ts
import { PostProcessor } from '@typora-community-plugin/core'

this.registerMarkdownPostProcessor(
  PostProcessor.from((el) => {
    el.querySelectorAll('h1').forEach(h => h.classList.add('my-heading'))
  }))
```



## HtmlPostProcessor

按 `selector` 选中元素后逐个调用 `process()`；未设置 `selector` 时对传入的整个元素调用。

```ts
import { HtmlPostProcessor } from '@typora-community-plugin/core'

this.registerMarkdownPostProcessor(
  HtmlPostProcessor.from({
    selector: 'blockquote',
    process(el) {
      el.classList.add('my-blockquote')
    },
  }))
```



## CodeblockPostProcessor

```ts
class CodeblockPostProcessor extends HtmlPostProcessor {
  type: 'codeblock'
  lang: string[]              // 代码块语言，默认 ['']
  button?: CodeBlockButtonOptions
  exportPreview: boolean      // 默认 false

  preview(code: string, el: HTMLElement): HTMLElement | Promise<HTMLElement>
  hasPreview(): boolean       // 是否重写了 preview()

  static from(options: Partial<Pick<CodeblockPostProcessor,
    'lang' | 'button' | 'preview' | 'exportPreview' | 'process'>>): CodeblockPostProcessor
}
```

### 添加按钮

```ts
this.registerMarkdownPostProcessor(
  CodeblockPostProcessor.from({
    lang: ['mermaid'],
    button: {
      text: '复制',
      title: '复制代码',
      onclick(event, { code }) {
        navigator.clipboard.writeText(code)
      },
    },
  }))
```

按钮回调的 `context` 包含：

| 字段 | 说明 |
| --- | --- |
| `codeblock` | 代码块 `<pre>` 元素。 |
| `code` | 代码块内的纯文本。 |

### 渲染预览

```ts
this.registerMarkdownPostProcessor(
  CodeblockPostProcessor.from({
    lang: ['wavedrom'],
    preview(code) {
      const el = document.createElement('div')
      el.textContent = render(code)
      return el
    },
  }))
```

预览会在内容变化后延迟重新渲染。导出时的行为见[导出](./3-export.md)。



## DecoratedTextPostprocessor

把匹配到的文本用 `editor.EditHelper.markRange()` 加上样式类，并可绑定点击事件。

```ts
import { DecoratedTextPostprocessor } from '@typora-community-plugin/core'

this.registerMarkdownPostProcessor(
  DecoratedTextPostprocessor.from({
    matches: [
      {
        regexp: /#([^\s#]+)/g,
        classname: 'typ-tag',
        onClick(event, el) {
          console.log('clicked tag:', el.textContent)
        },
      },
    ],
    // 默认 '.md-end-block .md-plain'
    selector: '.md-end-block .md-plain',
  }))
```

| 选项 | 说明 |
| --- | --- |
| `matches` | 匹配规则数组。 |
| `matches[].regexp` | 用于匹配文本的正则，建议带 `g` 标志。 |
| `matches[].classname` | 匹配文本应用的 CSS 类。 |
| `matches[].onClick` | 点击匹配文本时调用。 |
| `selector` | 要处理的文本元素选择器。 |

> 处理器会跳过输入法组合输入期间（IME），并在修改 DOM 后恢复光标位置。若正则包含第 1 个捕获组，该组匹配到的文本不会应用样式；例如 `/(#)([^\s#]+)/` 只装饰 `#` 后面的标签名。



## 注册代码块语言

除了修改已渲染的代码块，还可以把新的代码块语言注册给 Typora 的 CodeMirror，使其支持语法高亮与语言自动完成：

```ts
import type { CodeblockModeOptions } from '@typora-community-plugin/core'

const options: CodeblockModeOptions = {
  lang: 'mylang',
  mode: () => ({
    startState: () => ({}),
    token: (stream: any) => {
      stream.next()
      return null
    },
  }),
}

this.register(this.app.features.markdownEditor.codeblock.registerMode(options))
```

| 字段 | 说明 |
| --- | --- |
| `lang` | 代码围栏语言名，同时作为 CodeMirror mode 名。 |
| `mode` | CodeMirror mode 定义。 |
| `render` | 可选。设置后把该语言接入 Typora 原生图表引擎，用于渲染代码块预览。 |

`registerMode()` 返回注销函数；插件中直接 `this.register(...)` 即可。

> 语法高亮用 `registerMode()`；需要自定义预览 DOM 时，配合 `CodeblockPostProcessor` 的 `preview()` 使用。



## 处理时机

- 编辑器触发 `edit` 事件时，执行所有后处理器；
- 编辑器触发 `scroll` 事件时，重新执行代码块后处理器；
- 标签页打开时，对新打开的 Markdown 视图执行一次。

后处理器应尽量幂等：同一个元素可能被多次处理，添加 DOM 前先检查是否已存在。



## 例子

- [typora-plugin-collapsible-section](https://github.com/typora-community-plugin/typora-plugin-collapsible-section) 为标题添加折叠按钮
- [typora-plugin-codeblock-copy-button](https://github.com/typora-community-plugin/typora-plugin-codeblock-copy-button) 为代码块添加复制按钮
