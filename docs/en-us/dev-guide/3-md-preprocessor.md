# Markdown Preprocessor

## Features

- Replace text with a function before Markdown is rendered;
- When reading Markdown (`preload`), hand the file content to the processor;
- When getting Markdown (`presave`), hand the processor's result to the caller.

Can be used to implement custom syntax.

**Note**: May affect the opening performance of large files (1k+ lines). Use with caution and test with large files. Prefer the [Markdown postprocessor](./3-md-postprocessor.md) or other approaches instead.



## Processor Structure

```ts
type TPreProcessor = {
  when: 'preload' | 'presave'
  type: 'mdtext' | 'code'
  process: (text: string) => string
}
```

| Field | Description |
| --- | --- |
| `when` | `preload`: process before file content enters the editor; `presave`: process when `getMarkdown()` is called. |
| `type` | `mdtext`: process the whole Markdown text; `code`: process only the inside of codeblocks. |
| `process` | Receives text and returns the replaced text. |

> `presave` does not only happen on "save": any call that reads Markdown (including `context.markdown` in statistics rows) triggers it.



## Registration

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

After registering with `registerMarkdownPreProcessor()`, the processor is removed automatically when the plugin is unloaded.



## Execution Order

1. Codeblocks are masked first (processors with `type: 'mdtext'` do not rewrite codeblock content);
2. During `preload`, HTML tags are masked as well;
3. `mdtext` processors run in registration order;
4. `code` processors run on the content of codeblocks;
5. HTML and codeblocks are restored.

If a processor throws, core logs the error and returns **the original text of this pass**, so the error text is never written into the document.



## mdtext vs. code

- `mdtext`: suitable for replacing custom syntax, e.g. turning `#tag` into an element with attributes.
- `code`: only processes the inside of codeblocks; useful for rewriting placeholders or variables inside code.
- Codeblocks are masked with a regular expression before processing, reducing the chance of `mdtext` processors damaging code, but complex syntax should still be tested first.



## Examples

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag) uses a regex to replace `#tag` with `<i alt="tag">#tag</i>` to support tags
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink) uses a regex to replace `[[link]]` with `<a>[[link]]</a>` to support wikilinks
