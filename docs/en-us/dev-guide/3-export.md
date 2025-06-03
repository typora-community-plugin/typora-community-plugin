# Export API

Allows developers to modify the exported file.

## Modify the Exported HTML

### Code Block Preview

If the preview of the code block is rendered by SVG or HTML, you can directly use `PostProcessor`'s `exportPreview: true` to support rendering the preview of the code block in the exported HTML.

```diff
this.register(
  this.app.features.markdownEditor.postProcessor.register(
    CodeblockPostProcessor.from({
      lang: ['wavedrom'],
+     exportPreview: true,
      // ...
    })))
```

### Custom Preview

```ts
this.register(
  this.app.features.exporter.register(
    CodeblockExportProcessor.from({
      lang: ['wavedrom'],
      process({ doc }) {
        // Modify the Document object `doc` of the exported HTML
        // After modification, `doc` will be converted to an HTML string for export
      }
    })))
```
