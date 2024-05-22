# Typora Community Plugin

[English](https://github.com/typora-community-plugin/typora-community-plugin#README.md) | 简体中文

一个适用于 [Typora](https://typora.io/) 的社区插件系统。受到 [Obsidian 插件系统](https://docs.obsidian.md/Home) 启发。

**警告**: 第三方插件可能有数据和隐私风险。

安全起见，请安装可以审查源码的开源插件。



## 模块

<details>
  <ul>
    <li><em>installer</em>: 注入 <em>loader</em> 到 Typora。</li>
    <li><em>loader</em>: 决定加载哪个版本的 <em>core</em> (生产环境或开发环境)。</li>
    <li><em>core</em>: 提供扩展 Typora 的 API 并管理插件。</li>
    <li><em>types</em>: Typora 全局变量的类型。</li>
    <li><em>esbuild-plugin</em>: 使用 esbuild 构建 <em>core</em> 和插件。</li>
  </ul>
</details>



## 兼容性

| 已测试  |                 |                 |             |
| :----: | --------------- | --------------- | ----------- |
| Typora | v1.5.x - v1.8.x | v1.5.x - v1.6.x | v1.4.8      |
| 系统    | Windows 10      | Ubuntu 22       | macOS 10.13 |



## 特性

- 插件管理
  - [x] 安装/卸载/更新 插件
  - [x] 启用/禁用 插件
- 新的 UI 组件
  - [x] Ribbon
  - [x] (模拟的) 多文件标签页
- [x] 自定义命令的快捷键
- 扩展 Typora 的 APIs
  - [x] Markdown 前处理器
  - [x] Markdown 后处理器
  - [x] Markdown 自动完成
- [x] I18n: 跟随系统或手动配置，现在支持英语和中文
- [x] 兼容 macOS
- 文档
  - [ ] 用户文档
  - [ ] 开发文档



## 预览

| Ribbon & 多文件标签页                   | 命令面板                                   |
| :-----------------------------------: | :---------------------------------------: |
| ![](./docs/assets/base.jpg)           | ![](./docs/assets/command-modal.jpg)      |
| 配置对话框                              | 插件市场                                   |
| ![](./docs/assets/settings-modal.jpg) | ![](./docs/assets/plugin-marketplace.jpg) |



### 已有插件

这些插件可通过插件市场安装

| 插件                              | 描述                                        |
| -------------------------------- | ------------------------------------------ |
| [callout][p1]                    | 支持标注块语法 `> [!type]`                    |
| [codeblock-copy-button][p2]      | 在多行代码块右上角添加一个复制按钮。              |
| [codeblock-highlight-mapper][p3] | 将语言 A 映射为语言 B，使用语言 B 的语法高亮代码。 |
| [collapsible-section][p4]        | 折叠/展开 Markdown 章节、列表、代码块           |
| [file-icon][p5]                  | 为不同类型文件显示不同图标                      |
| [front-matter][p6]               | 自动编辑 front matter 的时间                  |
| [note-refactor][p7]              | 提取选中文本到新文件                           |
| [note-snippets][p8]              | 使用斜线指令输入笔记片段                        |
| [tag][p9]                        | 高亮 `#tag` 语法                             |
| [wikilink][p10]                  | 支持通过 `[[text]]` 链接跳转                  |



## 安装

见 [用户文档 -> 如何安装](./docs/zh-cn/user-guide/1-installation.md)



## 使用

### 快捷键

| 快捷键                       | 功能         |
| --------------------------- | ----------- |
| <kbd>F1</kbd>               | 打开命令面板  |
| <kbd>Ctrl</kbd>+<kbd>.</kbd>| 打开设置对话框 |



## 卸载

见 [用户文档 -> 如何卸载](./docs/zh-cn/user-guide/2-uninstall.md)



## 插件开发

见 [开发文档 -> 快速开始](./docs/zh-cn/dev-guide/1-getting-started.md)



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
