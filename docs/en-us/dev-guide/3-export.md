# Export

Allows plugins to modify exported HTML.



## Modify Exported HTML

### Codeblock Preview

If a codeblock preview is drawn with SVG or HTML, set `exportPreview: true` on a `CodeblockPostProcessor` to copy the preview into the exported HTML:

```ts
import { CodeblockPostProcessor } from '@typora-community-plugin/core'

this.register(
  this.app.features.markdownEditor.postProcessor.register(
    CodeblockPostProcessor.from({
      lang: ['wavedrom'],
      preview: code => {
        // return the preview HTMLElement
        return renderWavedrom(code)
      },
      exportPreview: true,
    })))
```

> **Note**: `exportPreview` belongs to `CodeblockPostProcessor`, not `PostProcessor`. It only takes effect when the processor overrides `preview()` (that is, when `hasPreview()` returns `true`); setting `exportPreview: true` alone with the default preview implementation does nothing.



### Custom Export Processor

Register export processors via `app.features.exporter`:

```ts
import { HtmlExportProcessor } from '@typora-community-plugin/core'

this.register(
  this.app.features.exporter.register(
    HtmlExportProcessor.from({
      process({ doc, html }) {
        // modify the exported Document object `doc` in place
        // core converts `doc` back to an HTML string when done
        doc.querySelectorAll('a[href^="http"]').forEach(a => {
          a.setAttribute('target', '_blank')
        })
      },
    })))
```

> The `ExportManager` class itself is not exported from the package entry; use the `app.features.exporter` instance instead.



## Processor Types

```ts
class ExportProcessor {
  type!: 'html'
  process(context: { type: 'html', html: string, doc: Document }): void
  static from(options: Partial<Pick<ExportProcessor, 'type' | 'process'>>): ExportProcessor
}

class HtmlExportProcessor extends ExportProcessor {
  type: 'html'
  process(context: { type: 'html', html: string, doc: Document }): void
  static from(options: Partial<Pick<HtmlExportProcessor, 'process'>>): HtmlExportProcessor
}

class CodeblockExportProcessor extends HtmlExportProcessor {
  lang!: string[]
  process(context: { type: 'html', html: string, doc: Document }): void
  static from(options: Partial<Pick<CodeblockExportProcessor, 'lang' | 'process'>>): CodeblockExportProcessor
}
```

| Type | Description |
| --- | --- |
| `ExportProcessor` | Base processor. |
| `HtmlExportProcessor` | HTML export processor; `type` is fixed to `html`. |
| `CodeblockExportProcessor` | Copies previews from the editor by codeblock language. |

Currently `ExportManager` only handles processors with `type === 'html'`; there are no other export types such as PDF or Docx.



## Export Timing

- Before exporting, `postProcessor.processAllCodeblock()` runs first to ensure codeblock previews are rendered;
- Processors run in registration order;
- `process()` modifies `doc` in place; the return value is ignored.



## Default Codeblock Export

`CodeblockExportProcessor` copies the contents of `.md-fences-adv-panel-preview` for the matching language from the editor into `pre[lang="..."]` in the exported HTML, and rewrites the class names to `md-diagram-panel md-fences-adv-panel`.

If you only register a `CodeblockPostProcessor` with `exportPreview: true`, core performs this step automatically, so you usually do not need to register a `CodeblockExportProcessor` manually.



## Examples

- [typora-plugin-codeblock-highlight-mapper](https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper)
