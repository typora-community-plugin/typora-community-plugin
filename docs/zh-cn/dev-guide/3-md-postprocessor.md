# Markdown 后处理器

渲染 Markdown 之后，修改编辑器 DOM。可用于添加非文本编辑的功能。



## 类型

| 类                       | 描述                                     | 例子                                                         |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------ |
| `PostProcessor`          | 基础后处理器                             | -                                                            |
| `CodeblockPostProcessor` | 代码块后处理器。支持添加按钮、渲染内容。 | [typora-plugin-codeblock-copy-button](https://github.com/typora-community-plugin/typora-plugin-codeblock-copy-button) 为代码块添加复制按钮 |
| `HtmlPostProcessor`      | HTML 后处理器。支持添加按钮。            | [typora-plugin-collapsible-section](https://github.com/typora-community-plugin/typora-plugin-collapsible-section) 为标题添加折叠按钮 |



## 注册

使用 Plugin 方法 `registerMarkdownPostProcessor()` 注册后，会在插件卸载时自动移除。
