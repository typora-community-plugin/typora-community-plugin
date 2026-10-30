# 开发文档

[Typora](https://typora.io/) 是一个跨平台的 Markdown 编辑器。其本身并没有提供插件系统，所以 [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) 参考 [Obsidian 插件系统](https://docs.obsidian.md/Home) 为社区提供了一个适用于 Typora 的插件系统。

本文档基于 `@typora-community-plugin/core` v2.10.x 编写。



## 阅读路线

1. [快速开始](./1-getting-started.md)：创建项目、编译并运行第一个插件。
2. [插件基础](./2-plugin.md)：插件包结构、manifest 字段与 `Plugin` 基类。
3. 扩展点：
   - [命令](./3-command.md)、[事件](./3-events.md)、[快捷键](./3-hotkey.md)
   - [设置存储](./3-settings.md)、[设置界面](./3-settings-ui.md)
   - [侧边栏](./3-sidebar.md)、[统计行](./3-statistics.md)
   - [Markdown 前处理器](./3-md-preprocessor.md)、[Markdown 后处理器](./3-md-postprocessor.md)、[自动完成](./3-suggestion.md)
   - [多语言](./3-locales.md)、[导出](./3-export.md)
4. 进阶能力：
   - [工作区与自定义视图](./4-workspace.md)
   - [通用 UI 组件](./4-ui.md)
   - [Metadata API](./4-metadata.md)
   - [工具函数与跨平台兼容层](./4-utils.md)
5. [发布](./9-releasing.md)：打包、创建 Release、发布到插件市场。



## 模块

| 模块 | 描述 |
| --- | --- |
| `installer` | 注入 `loader` 到 Typora。 |
| `loader` | 决定加载哪个版本的 `core`（生产环境或开发环境）。 |
| `core` | 提供扩展 Typora 的 API 并管理插件。 |
| `types` | Typora 全局变量的类型。 |
| `esbuild-plugin` | 使用 esbuild 构建 `core` 和插件。 |
| `rollup-plugin` | 使用 Rollup 构建插件，把 `typora` 与 `@typora-community-plugin/core` 映射为运行时全局变量。 |



## 开发相关特性

- UI 扩展
  - [x] Ribbon 和自定义面板
  - [x] 状态栏按钮
  - [x] 设置页与设置弹窗
  - [x] 自定义工作区视图（标签页、左右分栏、右侧栏、浮动窗口）
- 扩展 Typora 的 API
  - [x] 命令、事件、快捷键
  - [x] Markdown 前处理器 / 后处理器 / 自动完成
  - [x] 代码块语言与预览渲染
  - [x] 统计行（词数面板）
  - [x] 导出处理器
  - [x] Metadata API
- [x] 插件设置存储与版本字段
- [x] I18n：跟随系统或手动配置，core 内置英语、简体中文、德语
- [x] 兼容 Windows / Linux / macOS
- [x] 编译代码后自动重启 Typora
