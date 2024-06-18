# Markdown 前处理器

## 功能

- 渲染 Markdown 之前，使用函数替换文本
- 保存 Markdown 之后，使用函数还原文本

可以用于实现自定义语法。

**注意**：可能影响大文件（1k+行的文件）的打开性能，请谨慎使用，并使用大文件进行测试。尽量使用 [Markdown 后处理器](./3-md-postprocessor.md) 或其他方法代替。



## 注册

使用 Plugin 方法 `registerMarkdownPreProcessor()` 注册后，会在插件卸载时自动移除。



## 例子

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag) 使用正则表达式替换 `#tag` 为 `<i alt="tag">#tag</i>` 以支持标签
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink) 使用正则表达式替换 `[[link]]` 为 `<a>[[link]]</a>` 以支持 wikilink
