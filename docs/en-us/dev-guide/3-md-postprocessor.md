# Markdown Postprocessor

Modify the editor DOM after Markdown is rendered. Can be used to add non-text-editing features such as buttons, decorated text, and codeblock previews.



## Types

| Class | Description | Example |
| --- | --- | --- |
| `PostProcessor` | Base postprocessor. | - |
| `HtmlPostProcessor` | Processes elements by CSS selector. | - |
| `CodeblockPostProcessor` | Codeblock postprocessor. Supports buttons and content previews. | [typora-plugin-codeblock-copy-button](https://github.com/typora-community-plugin/typora-plugin-codeblock-copy-button) |
| `DecoratedTextPostprocessor` | Decorated text (highlight/click) postprocessor. | [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag) |

`registerMarkdownPostProcessor()` accepts either a processor instance or a plain function:

```ts
this.registerMarkdownPostProcessor(el => {
  // el is the editor root element
})
```



## Common Interfaces

```ts
interface PostProcessorContext {
  /** Editor mode uses `#write`, preview mode uses `.typ-markdown-view` */
  containerEl: HTMLElement
}

interface ButtonOptions<T = any> {
  text: string
  title?: string
  className?: string
  onclick: (event: MouseEvent & { target: HTMLElement }, context: T) => void
}

class PostProcessor {
  process(el: HTMLElement, context: PostProcessorContext): void // must be overridden
  renderButton(parent: HTMLElement, button: ButtonOptions): void
  setupButtonContainer(parent: HTMLElement, position?: InsertPosition): HTMLElement
  static from(process: RawProcessor | Pick<PostProcessor, 'process'>): PostProcessor
}
```

`PostProcessor.process()` throws by default and must be implemented. Exceptions are caught and logged and do not interrupt other processors.



## PostProcessor

```ts
import { PostProcessor } from '@typora-community-plugin/core'

this.registerMarkdownPostProcessor(
  PostProcessor.from((el) => {
    el.querySelectorAll('h1').forEach(h => h.classList.add('my-heading'))
  }))
```



## HtmlPostProcessor

Selects elements by `selector` and calls `process()` on each; when `selector` is not set, it is called on the whole element passed in.

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
  lang: string[]              // codeblock languages, defaults to ['']
  button?: CodeBlockButtonOptions
  exportPreview: boolean      // defaults to false

  preview(code: string, el: HTMLElement): HTMLElement | Promise<HTMLElement>
  hasPreview(): boolean       // whether preview() is overridden

  static from(options: Partial<Pick<CodeblockPostProcessor,
    'lang' | 'button' | 'preview' | 'exportPreview' | 'process'>>): CodeblockPostProcessor
}
```

### Adding a Button

```ts
this.registerMarkdownPostProcessor(
  CodeblockPostProcessor.from({
    lang: ['mermaid'],
    button: {
      text: 'Copy',
      title: 'Copy code',
      onclick(event, { code }) {
        navigator.clipboard.writeText(code)
      },
    },
  }))
```

The `context` of the button callback contains:

| Field | Description |
| --- | --- |
| `codeblock` | The codeblock `<pre>` element. |
| `code` | The plain text inside the codeblock. |

### Rendering a Preview

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

Previews are re-rendered with a delay after content changes. See [Export](./3-export.md) for behavior during export.



## DecoratedTextPostprocessor

Applies a style class to matched text with `editor.EditHelper.markRange()`, and can bind click events.

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
    // defaults to '.md-end-block .md-plain'
    selector: '.md-end-block .md-plain',
  }))
```

| Option | Description |
| --- | --- |
| `matches` | Array of match rules. |
| `matches[].regexp` | Regex used to match text; using the `g` flag is recommended. |
| `matches[].classname` | CSS class applied to matched text. |
| `matches[].onClick` | Called when matched text is clicked. |
| `selector` | Selector of the text elements to process. |

> The processor skips IME composition and restores the cursor position after modifying the DOM. If the regex has a first capture group, the text matched by that group is not styled; for example, `/(#)([^\s#]+)/` only decorates the tag name after `#`.



## Registering a Codeblock Language

Besides modifying rendered codeblocks, you can register new codeblock languages with Typora's CodeMirror so they get syntax highlighting and language autocompletion:

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

| Field | Description |
| --- | --- |
| `lang` | Code fence language name, also used as the CodeMirror mode name. |
| `mode` | CodeMirror mode definition. |
| `render` | Optional. When set, the language is wired into Typora's native diagram engine to render codeblock previews. |

`registerMode()` returns an unregister function; in a plugin, simply use `this.register(...)`.

> Use `registerMode()` for syntax highlighting; to customize the preview DOM, combine it with `preview()` of `CodeblockPostProcessor`.



## Processing Timing

- When the editor fires the `edit` event, all postprocessors run;
- When the editor fires the `scroll` event, codeblock postprocessors run again;
- When a tab opens, they run once on the newly opened Markdown view.

Postprocessors should be idempotent where possible: the same element may be processed multiple times, so check whether something already exists before adding DOM.



## Examples

- [typora-plugin-collapsible-section](https://github.com/typora-community-plugin/typora-plugin-collapsible-section) adds collapse buttons to headings
- [typora-plugin-codeblock-copy-button](https://github.com/typora-community-plugin/typora-plugin-codeblock-copy-button) adds copy buttons to codeblocks
