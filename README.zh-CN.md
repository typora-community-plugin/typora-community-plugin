# Typora Community Plugin

[English](https://github.com/typora-community-plugin/typora-community-plugin#README.md) | 简体中文

一个适用于 [Typora](https://typora.io/) 的社区插件系统。受到 [Obsidian 插件系统](https://docs.obsidian.md/Home) 启发。

**警告**: 第三方插件可能有数据和隐私风险。

安全起见，请安装可以审查源码的开源插件。



## 预览

| Ribbon & 多文件标签页                   | 命令面板                                   |
| :-----------------------------------: | :---------------------------------------: |
| ![](./docs/assets/base.jpg)           | ![](./docs/assets/command-modal.jpg)      |
| 配置对话框                              | 插件市场                                   |
| ![](./docs/assets/settings-modal.jpg) | ![](./docs/assets/plugin-marketplace.jpg) |



### 兼容性

| 已测试  |                 |                 |                 |
| :----: | --------------- | --------------- | --------------- |
| Typora | v1.5.x - v1.9.x | v1.5.x - v1.9.x | v1.4.8 - v1.9.4 |
| 系统    | Windows 10      | Ubuntu 22       | macOS 10.13, 14 |



## 特性 <small>([更新日志](./docs/zh-cn/user-guide/CHANGELOG.md))</small>

- 插件管理
  - [x] 安装/卸载/更新 插件
  - [x] 启用/禁用 插件
- 新的 UI 组件
  - [x] Ribbon
  - [x] (模拟的) 多文件标签页
- [x] 自定义命令的快捷键
- [x] I18n: 跟随系统或手动配置，现在支持英语和中文
- [x] 兼容 macOS



### 现有插件

这些插件可通过插件市场[安装](./docs/zh-cn/user-guide/2-plugin-installation.md)：

| 插件                              | 描述                                        |
| -------------------------------- | ------------------------------------------ |
| [abcjs][p12]                     | 支持在多行代码块中使用 ABC 记谱法。              |
| [callout][p1]                    | 支持标注块语法 `> [!type]`                    |
| [code-folding][p14]              | 令多行代码块中的代码可折叠。                     |
| [codeblock-copy-button][p2]      | 在多行代码块右上角添加一个复制按钮。              |
| [codeblock-highlight-mapper][p3] | 将语言 A 映射为语言 B，使用语言 B 的语法高亮代码。 |
| [collapsible-section][p4]        | 折叠/展开 Markdown 章节、列表、代码块、表格、引用块、标注块 |
| [darkmode][p13]                  | 适用于任意亮色主题的暗黑模式。                   |
| [file-icon][p5]                  | 为不同类型文件显示不同图标                      |
| [footnotes][p18]                 | 脚注标记自动完成 & 重新编号数字脚注               |
| [front-matter][p6]               | 自动编辑 Front Matter，包括创建时间、编辑时间等   |
| [image-location][p15]            | 相对于当前笔记目录的根目录解析图片路径             |
| [image-viewer][p16]              | 查看当前文档所有图片                           |
| [markmap][p11]                   | 支持在多行代码块中使用 Markmap                  |
| [note-refactor][p7]              | 提取选中文本到新文件                           |
| [note-snippets][p8]              | 使用斜线指令输入笔记片段                        |
| [tag][p9]                        | 高亮 `#tag` 语法，自动完成，提供标签面板管理和搜索标签 |
| [templater][p19]                 | 从模板创建笔记                                 |
| [wavedrom][p17]                  | 支持在多行代码块中使用 WaveDrom                 |
| [wikilink][p10]                  | 支持通过 `[[text]]` 链接跳转，自动完成           |


## 用户文档

- [如何安装](./docs/zh-cn/user-guide/1a-installation.md)
- [在插件市场安装插件](./docs/zh-cn/user-guide/2-plugin-installation.md)
- [如何卸载](./docs/zh-cn/user-guide/1b-uninstall.md)



### 默认快捷键

| 快捷键                       | 功能         |
| --------------------------- | ----------- |
| <kbd>F1</kbd>               | 打开命令面板  |
| <kbd>Ctrl</kbd>+<kbd>.</kbd>| 打开设置对话框 |



## 开发文档

见 [开发文档](./docs/zh-cn/dev-guide/0-dev-docs.md) 或 [快速开始](./docs/zh-cn/dev-guide/1-getting-started.md)



## 贡献

欢迎 pull requests。



## 支持

如果你用任何问题或建议可以在 [这里](https://github.com/typora-community-plugin/typora-community-plugin/issues) 创建一个 Issue。



[p1]: https://github.com/typora-community-plugin/typora-plugin-callout
[p2]: https://github.com/typora-community-plugin/typora-plugin-codeblock-copy-button
[p3]: https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper
[p4]: https://github.com/typora-community-plugin/typora-plugin-collapsible-section
[p5]: https://github.com/typora-community-plugin/typora-plugin-file-icon
[p6]: https://github.com/typora-community-plugin/typora-plugin-front-matter
[p7]: https://github.com/typora-community-plugin/typora-plugin-note-refactor
[p8]: https://github.com/typora-community-plugin/typora-plugin-note-snippets
[p9]: https://github.com/typora-community-plugin/typora-plugin-tag
[p10]: https://github.com/typora-community-plugin/typora-plugin-wikilink
[p11]: https://github.com/typora-community-plugin/typora-plugin-markmap
[p12]: https://github.com/typora-community-plugin/typora-plugin-abcjs
[p13]: https://github.com/typora-community-plugin/typora-plugin-darkmode
[p14]: https://github.com/typora-community-plugin/typora-plugin-code-folding
[p15]: https://github.com/typora-community-plugin/typora-plugin-image-location
[p16]: https://github.com/typora-community-plugin/typora-plugin-image-viewer
[p17]: https://github.com/typora-community-plugin/typora-plugin-wavedrom
[p18]: https://github.com/typora-community-plugin/typora-plugin-footnotes
[p19]: https://github.com/typora-community-plugin/typora-plugin-templater
