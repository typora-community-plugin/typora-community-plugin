# 如何安装

安装 Typora Community Plugin 后，Typora 会在启动时自动加载插件系统，并在界面上增加活动栏、文件标签页、右侧面板和「插件配置」入口。

## 安装前准备

1. 退出 Typora。
2. 从 [Release][release] 下载 `typora-community-plugin.zip`。
3. 解压文件。

> 手动安装需要修改 Typora 安装目录内的文件，建议先备份 `window.html`，安装失败时可以还原后重试。

## 脚本安装

1. 运行 `install-windows.ps1`（Windows）或 `install-*.sh`（Linux / macOS）。
2. 按脚本提示完成安装。
3. 启动 Typora。

详细用法请查看 `typora-community-plugin.zip` 中的 `README.zh-CN.md`。

## 手动安装

**Windows 用户**

1. 复制解压后的文件到 `%UserProfile%\.typora\community-plugins`。
   > `%UserProfile%` 即用户目录 `C:\Users\{用户名}\`
2. 创建文件夹的符号链接。以管理员身份运行 `cmd`，然后运行命令
   `mklink /d %UserProfile%\AppData\Roaming\Typora\plugins %UserProfile%\.typora\community-plugins`。
3. 备份文件 `{Typora 安装目录}/resources/window.html`。（如果修改不成功，需要还原文件后再次尝试修改）
4. 修改文件 `{Typora 安装目录}/resources/window.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `window.html`，替换文件末尾的文本 `</body></html>` 为 `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`。

**Linux 用户**

1. 复制解压后的文件到 `~/.config/Typora/plugins`。
2. 备份文件 `/usr/share/typora/resources/window.html`。（如果修改不成功，需要还原文件后再次尝试修改）
3. 修改文件 `/usr/share/typora/resources/window.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `window.html`，替换文件末尾的文本 `</body></html>` 为 `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`。

**macOS 用户**

1. 复制解压后的文件到 `/Users/{UserName}/Library/Application Support/abnerworks.Typora/plugins`（如果不存在 `plugins` 文件夹，请手动创建）。
2. 右键 `Typora.app`，点击「显示包内容」，进入应用内部文件夹。
3. 备份文件 `Typora.app/Contents/Resources/TypeMark/index.html`。（如果修改不成功，需要还原文件后再次尝试修改）
4. 修改文件 `Typora.app/Contents/Resources/TypeMark/index.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `index.html`，替换文件末尾的文本 `</body>` 为 `<script src="file:///Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins/loader.js" type="module"></script></body>`，其中 `{UserName}` 需要替换为你的 macOS 账号名。

## 检查安装结果

安装成功后：

- 界面左侧出现**活动栏**，编辑器上方出现**文件标签页**。
- 按下 <kbd>Ctrl</kbd>+<kbd>.</kbd> 能打开**插件配置对话框**。

不想显示这些界面时：

- 隐藏活动栏：插件配置对话框 → [外观](./3b-appearance.md) → 高级选项 → 取消勾选「显示活动栏」。
- 关闭多标签：插件配置对话框 → [内置插件](./3d-internal-plugins.md) → 取消勾选「工作区」。

## 安装失败

安装后没有显示活动栏和文件标签页，请按以下步骤检查：

1. 打开开发人员工具，检查是否有报错：
   - Windows / Linux：使用快捷键 <kbd>Shift</kbd>+<kbd>F12</kbd>。
   - macOS：菜单栏「帮助」→「启用调试」，然后右键单击编辑区，选择「检查元素」；对于 macOS ≥ 13.3 且 Typora ≥ 1.9，见[如何在 Typora 中调试](https://support.typoraio.cn/Debug-Themes/)。
2. 有报错时，截图或复制日志，在 [Issues][issues] 中反馈。
3. 没有报错时，按下面顺序排查：
   - 确认 `loader.js` 位于插件目录中，且插件目录路径与 `window.html` 中新增的 `<script src=...>` 一致。
   - 确认 `window.html` 以 UTF-8 编码保存，末尾新增的 `<script>` 标签没有被转义。
   - 修改 `loader.json` 文件中的 `"debug":false` 为 `"debug":true`，重启 Typora。
   - 打开开发人员工具的 Console 选项卡，在 Filter 输入框中输入 `core.js` 过滤日志。
   - 截图或复制日志，在 [Issues][issues] 中反馈。

## 相关页面

- [升级插件](./1c-update.md)
- [如何卸载](./1b-uninstall.md)
- [插件安装](./2-plugin-installation.md)

[issues]: https://github.com/typora-community-plugin/typora-community-plugin/issues
[release]: https://github.com/typora-community-plugin/typora-community-plugin/releases
[ws]: https://github.com/typora-community-plugin/typora-community-plugin/issues/9
