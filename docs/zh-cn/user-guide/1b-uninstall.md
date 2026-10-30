# 如何卸载

卸载会移除插件系统的启动脚本，Typora 恢复为原生界面。

## 卸载前准备

1. 退出 Typora。
2. 从 [Release][release] 下载 `typora-community-plugin.zip`。
3. 解压文件。

## 脚本卸载

1. 运行 `uninstall-windows.ps1`（Windows）或 `uninstall-*.sh`（Linux / macOS）。
2. 按脚本提示完成卸载。

详细用法请查看 `typora-community-plugin.zip` 中的 `README.zh-CN.md`。

## 手动卸载

**Windows 用户**

1. 删除文件夹 `%UserProfile%\.typora\community-plugins`。
2. 删除符号链接 `%UserProfile%\AppData\Roaming\Typora\plugins`。
3. 修改文件 `{Typora 安装目录}/resources/window.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `window.html`，删除文件末尾部分添加的文本 `<script src="typora://app/userData/plugins/loader.js" type="module"></script>`。

**Linux 用户**

1. 删除文件夹 `~/.config/Typora/plugins`。
2. 修改文件 `/usr/share/typora/resources/window.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `window.html`，删除文件末尾部分添加的文本 `<script src="typora://app/userData/plugins/loader.js" type="module"></script>`。

**macOS 用户**

1. 删除文件夹 `/Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins`。
2. 右键 `Typora.app`，点击「显示包内容」，进入应用内部文件夹，修改文件 `Typora.app/Contents/Resources/TypeMark/index.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `index.html`，删除文件末尾部分添加的文本 `<script src="file:///Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins/loader.js" type="module"></script>`，其中 `{UserName}` 需要替换为你的 macOS 账号名。

## 注意与限制

- 卸载不会删除你的笔记，但会一并删除插件目录下的**社区插件**、**全局设置**与**快捷键配置**。想保留配置时，先把插件目录复制一份。
- 笔记库内的 `.typora` 目录（本地设置、本地插件）不在卸载范围内，需要手动删除。

## 相关页面

- [如何安装](./1a-installation.md)
- [设置总览](./3-settings.md)

[release]: https://github.com/typora-community-plugin/typora-community-plugin/releases
[ws]: https://github.com/typora-community-plugin/typora-community-plugin/issues/9
