# How to install



### Script install

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Run `install.ps1` (only for Windows) as Admin to install. <br> If you want to install it for custom Typora installed directory, run `install.ps1 -root <TyporaHome>` as Admin.



### Manual install

**for Windows**

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `%UserProfile%/.typora/community-plugins`.
4. Create a symlink. Run `cmd` as admin, and run command `mklink /d %UserProfile%\\AppData\\Roaming\\Typora\\plugins %UserProfile%\\.typora\\community-plugins`.
5. Modify `{TyporaHome}/resources/window.html`. Open the file with encoding UTF-8, then replace text `</body></html>` at the end of file as `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`.



**for Linux**

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `~/.config/Typora/plugins`.
4. Modify `/usr/share/typora/resources/window.html`. Open the file with encoding UTF-8, then replace text `</body></html>` at the end of file as `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`.



**for macOS**

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `/Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins`.
4. Right click `Typora.app`, then click menu item "Show Package Contents" to open the app inner folder. Modify `Typora.app/Contents/Resources/TypeMark/index.html`. Open the file with encoding UTF-8, then replace text `</body>` at the end of file as `<script src="file:///Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins/loader.js" type="module"></script></body>`, and `{UserName}` need to be replaced with your current user name of macOS.



**PS:** After installation, [Ribbon](./3-ribbon.md) & [Multi File Tabs](./3-file-tabs.md) will be shown by default. You can hide them in the Setting Modal.



[release]: https://github.com/typora-community-plugin/typora-community-plugin/releases
