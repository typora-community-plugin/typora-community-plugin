# 开发文档

[Typora](https://typora.io/) 是一个跨平台的 Markdown 编辑器。其本身并没有提供插件系统，所以 [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) 参考 [Obsidian 插件系统](https://docs.obsidian.md/Home) 为社区提供了一个适用于 Typora 的插件系统。



## 模块

- `installer`: 注入 `loader` 到 Typora。
- `loader`: 决定加载哪个版本的 `core` (生产环境或开发环境)。
- `core`: 提供扩展 Typora 的 API 并管理插件。
- `types`: Typora 全局变量的类型。
- `esbuild-plugin`: 使用 esbuild 构建 `core` 和插件。



## 开发相关特性

- UI 扩展
  - [x] Ribbon 核自定义面板
- [x] 自定义命令的快捷键
- 扩展 Typora 的 APIs
  - [x] Markdown 前处理器
  - [x] Markdown 后处理器
  - [x] Markdown 自动完成
- [x] I18n: 跟随系统或手动配置，现在支持英语和中文
- [x] 兼容 macOS
- [x] 编译代码后自动重启 Typora
