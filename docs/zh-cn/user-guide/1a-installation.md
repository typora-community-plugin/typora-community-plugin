# 如何安装



### 脚本安装

1. 从 [Release][release] 下载 `typora-community-plugin.zip`。
2. 解压文件。
3. 以管理员身份运行 `install.ps1` (只适用于 Windows)。 <br> 如果你想为自定义安装目录的 Typora 安装它，请以管理员身份运行 `install.ps1 -root <TyporaHome>`。



### 手动安装

**Windows 用户**

1. 从 [Release][release] 下载 `typora-community-plugin.zip`。
2. 解压文件。
3. 复制文件到 `%UserProfile%/.typora/community-plugins`。
4. 创建文件夹的符号链接。以管理员身份运行 `cmd` ，然后运行命令 `mklink /d %UserProfile%\\AppData\\Roaming\\Typora\\plugins %UserProfile%\\.typora\\community-plugins`。
5. 修改文件 `{Typora 安装目录}/resources/window.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `window.html`，替换文件末尾的文本 `</body></html>` 为 `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`。



**Linux 用户**

1. 从 [Release][release] 下载 `typora-community-plugin.zip`。
2. 解压文件。
3. 复制文件到 `~/.config/Typora/plugins`。
4. 修改文件 `/usr/share/typora/resources/window.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `window.html`，替换文件末尾的文本 `</body></html>` 为 `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`。



**macOS 用户**

1. 从 [Release][release] 下载 `typora-community-plugin.zip`。
2. 解压文件。
3. 复制文件到 `/Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins`
4. 右键 `Typora.app`，点击“显示包内容”，进入应用内部文件夹，修改文件 `Typora.app/Contents/Resources/TypeMark/index.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `index.html`，替换文件末尾的文本 `</body>` 为 `<script src="file:///Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins/loader.js" type="module"></script></body>`，其中 `{UserName}` 需要替换为你的 macOS 账号名。



**PS:** 安装成功后，默认显示 Ribbon & 多文件标签页。可以在设置中手动隐藏。



[release]: https://github.com/typora-community-plugin/typora-community-plugin/releases
