# 如何卸载

**Windows 用户**

1. 删除文件夹 `%UserProfile%/.typora/community-plugins`。
2. 删除符号链接 `%UserProfile%/AppData/Roaming/Typora/plugins`。
3. 修改文件 `{Typora 安装目录}/resources/window.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `window.html`，删除文件末尾部分的添加的文本 `<script src="typora://app/userData/plugins/loader.js" type="module"></script>`。

**Linux 用户**

1. 删除文件夹 `~/.config/Typora/plugins`。
2. 修改文件 `/usr/share/typora/resources/window.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `window.html`，删除文件末尾部分的添加的文本 `<script src="typora://app/userData/plugins/loader.js" type="module"></script>`。

**macOS 用户**

1. 删除文件夹 `/Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins`
2. 右键 `Typora.app`，点击“显示包内容”，进入应用内部文件夹，修改文件 `Typora.app/Contents/Resources/TypeMark/index.html`。使用 UTF-8 编码（否则会[白屏][ws]）打开文件 `index.html`，删除文件末尾部分的添加的文本 `<script src="file:///Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins/loader.js" type="module"></script>`，其中 `{UserName}` 需要替换为你的 macOS 账号名。



[ws]: https://github.com/typora-community-plugin/typora-community-plugin/issues/9
