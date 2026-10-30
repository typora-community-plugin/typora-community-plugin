# 导出

允许插件修改导出的 HTML。



## 修改导出的 HTML

### 代码块预览

如果代码块的预览是由 SVG 或 HTML 绘制的，可以给 `CodeblockPostProcessor` 设置 `exportPreview: true`，把预览复制到导出的 HTML 中：

```ts
import { CodeblockPostProcessor } from '@typora-community-plugin/core'

this.register(
  this.app.features.markdownEditor.postProcessor.register(
    CodeblockPostProcessor.from({
      lang: ['wavedrom'],
      preview: code => {
        // 返回预览用的 HTMLElement
        return renderWavedrom(code)
      },
      exportPreview: true,
    })))
```

> **注意**：`exportPreview` 属于 `CodeblockPostProcessor`，不是 `PostProcessor`。只有当处理器重写了 `preview()`（即 `hasPreview()` 返回 `true`）时才会生效；只写 `exportPreview: true` 而提供默认预览实现是无效的。



### 自定义导出处理器

通过 `app.features.exporter` 注册导出处理器：

```ts
import { HtmlExportProcessor } from '@typora-community-plugin/core'

this.register(
  this.app.features.exporter.register(
    HtmlExportProcessor.from({
      process({ doc, html }) {
        // 原地修改导出的 Document 对象 `doc`
        // 修改完成后，core 会把 `doc` 转回 HTML 字符串
        doc.querySelectorAll('a[href^="http"]').forEach(a => {
          a.setAttribute('target', '_blank')
        })
      },
    })))
```

> `ExportManager` 类本身没有从包入口导出，请使用 `app.features.exporter` 实例。



## 处理器类型

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

| 类型 | 说明 |
| --- | --- |
| `ExportProcessor` | 基础处理器。 |
| `HtmlExportProcessor` | HTML 导出处理器，`type` 固定为 `html`。 |
| `CodeblockExportProcessor` | 按代码块语言复制编辑器中的预览。 |

当前 `ExportManager` 只处理 `type === 'html'` 的处理器，没有 PDF、Docx 等其他导出类型。



## 导出时机

- 导出前会先执行 `postProcessor.processAllCodeblock()`，确保代码块预览已渲染；
- 处理器按注册顺序依次执行；
- `process()` 原地修改 `doc`，返回值会被忽略。



## 默认代码块导出

`CodeblockExportProcessor` 会把编辑器中对应语言的 `.md-fences-adv-panel-preview` 内容复制到导出 HTML 的 `pre[lang="..."]` 中，并改写为 `md-diagram-panel md-fences-adv-panel` 类名。

只注册 `CodeblockPostProcessor` 且设置 `exportPreview: true` 时，core 会自动完成这一步，通常不需要手动注册 `CodeblockExportProcessor`。



## 例子

- [typora-plugin-codeblock-highlight-mapper](https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper)
