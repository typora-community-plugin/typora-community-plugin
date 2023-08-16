# Typora Community Plugin

[English](https://github.com/typora-community-plugin/typora-community-plugin#README.md) | 简体中文

一个适用于 [Typora](https://typora.io/) 的社区插件系统。受到 [Obsidian 插件系统](https://marcus.se.net/obsidian-plugin-docs/) 启发。

**警告**: 第三方插件可能有数据和隐私风险。



## 模块

- `installer`: 注入 `loader` 到 Typora。
- `loader`: 决定加载哪个版本的 `core` (生产环境或开发环境)。
- `core`: 提供扩展 Typora 的 API 并管理插件。
- `types`: Typora 全局变量的类型。
- `esbuild-plugin`: 使用 esbuild 构建 `core` 和插件。



## 兼容性

| Core 版本 | 已测试的 Typora | Windows | Linux | MacOS |
| --------- | ------------- | ------- | ----- | ----- |
| v2+       | v1.5+         | ✅      | ❌    | ❌    |

- ✅: 已在该平台测试
- ❌: 未在该平台测试



## 特性

- 插件管理
  - 安装/卸载 插件
  - 启用/禁用 插件
- 新的 UI 组件
  - Ribbon
  - (模拟的) 多文件标签页
- 自定义命令的快捷键
- 扩展 Typora 的 APIs
  - Markdown 前处理器
  - Markdown 后处理器
  - Markdown 自动完成
- I18n: 跟随系统，现在支持英语和中文



## 预览

![](https://fastly.jsdelivr.net/gh/typora-community-plugin/typora-community-plugin@main/docs/assets/base.jpg)

![](https://fastly.jsdelivr.net/gh/typora-community-plugin/typora-community-plugin@main/docs/assets/command-modal.jpg)

![](https://fastly.jsdelivr.net/gh/typora-community-plugin/typora-community-plugin@main/docs/assets/settings-modal.jpg)

![](https://fastly.jsdelivr.net/gh/typora-community-plugin/typora-community-plugin@main/docs/assets/plugin-marketplace.jpg)



## 贡献

欢迎 pull requests。



## 支持

如果你用任何问题或建议可以在 [这里](https://github.com/typora-community-plugin/typora-community-plugin/issues) 创建一个 Issue。
