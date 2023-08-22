# Typora Community Plugin

[English](https://github.com/typora-community-plugin/typora-community-plugin#README.md) | 简体中文

一个适用于 [Typora](https://typora.io/) 的社区插件系统。受到 [Obsidian 插件系统](https://docs.obsidian.md/Home) 启发。

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
| v2+       | v1.5+         | ✅      | ❓    | ❓    |

- ✅: 已在该平台测试
- ❓: 未在该平台测试



## 特性

- 插件管理
  - 安装/卸载/更新 插件
  - 启用/禁用 插件
- 新的 UI 组件
  - Ribbon
  - (模拟的) 多文件标签页
- 自定义命令的快捷键
- 扩展 Typora 的 APIs
  - Markdown 前处理器
  - Markdown 后处理器
  - Markdown 自动完成
- I18n: 跟随系统或手动配置，现在支持英语和中文



## 预览

| Ribbon & 多文件标签页                   | 命令面板                                   |
| :-----------------------------------: | :---------------------------------------: |
| ![](./docs/assets/base.jpg)           | ![](./docs/assets/command-modal.jpg)      |
| 配置对话框                              | 插件市场                                   |
| ![](./docs/assets/settings-modal.jpg) | ![](./docs/assets/plugin-marketplace.jpg) |



## 安装

### 脚本安装

1. 从 [Release](https://github.com/typora-community-plugin/typora-community-plugin/releases) 下载 `typora-community-plugin.zip`。
2. 解压文件。
3. 以管理员身份运行 `install.ps1` (只适用于 Windows)。

### 手动安装

1. 从 [Release](https://github.com/typora-community-plugin/typora-community-plugin/releases) 下载 `typora-community-plugin.zip`。
2. 解压文件。
3. 复制文件到 `%UserProfile%/.typora/comunity-plugins`。
4. 创建文件夹的符号链接。以管理员身份运行 `cmd` ，然后运行命令 `mklink /d %UserProfile%\\AppData\\Roaming\\Typora\\plugins %UserProfile%\\.typora\\community-plugins`。
5. 修改文件 `{Typora 安装目录}/resources/window.html`。使用 UTF-8 编码打开该文件，替换文件末尾的文本 `</body></html>` 为 `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`。



## 使用

### 快捷键

| 快捷键                       | 功能         |
| --------------------------- | ----------- |
| <kbd>F1</kbd>               | 打开命令面板  |
| <kbd>Ctrl</kbd>+<kbd>.</kbd>| 打开设置对话框 |



## 贡献

欢迎 pull requests。



## 支持

如果你用任何问题或建议可以在 [这里](https://github.com/typora-community-plugin/typora-community-plugin/issues) 创建一个 Issue。
