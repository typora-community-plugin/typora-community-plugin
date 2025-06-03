# 导出 API

允许开发者修改导出的文件。

## 修改导出的 HTML

### 代码块预览

如果代码块的预览是由 SVG 或 HTML 绘制的，可以直接使用 `PostProcessor` 的 `exportPreview: true` 支持在导出的 HTML 渲染代码块的预览

```diff
this.register(
  this.app.features.markdownEditor.postProcessor.register(
    CodeblockPostProcessor.from({
      lang: ['wavedrom'],
+     exportPreview: true,
      // ...
    })))
```

### 自定义预览

```ts
this.register(
  this.app.features.exporter.register(
    CodeblockExportProcessor.from({
      lang: ['wavedrom'],
      process({ doc }) {
        // 修改导出的 HTML 的 Document 对象 `doc`
        // 修改完毕后，`doc` 将被转换为 HTML 字符串导出
      }
    })))
```
