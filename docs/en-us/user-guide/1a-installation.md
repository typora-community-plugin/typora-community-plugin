# How to install



### Script installation

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Run `install-windows.ps1` or `install-*.sh` (See `README.md` in `typora-community-plugin.zip`)



### Manual installation

**for Windows**

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `%UserProfile%/.typora/community-plugins`.
4. Create a symlink. Run `cmd` as admin, and run command `mklink /d %UserProfile%\\AppData\\Roaming\\Typora\\plugins %UserProfile%\\.typora\\community-plugins`.
5. Backup `{TyporaHome}/resources/window.html`. (If fail to use this plugin system after installation, you can revert it back to the original file and try again.)
6. Modify `{TyporaHome}/resources/window.html`. Open the file with encoding UTF-8, then replace text `</body></html>` at the end of file as `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`.



**for Linux**

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `~/.config/Typora/plugins`.
4. Backup `/usr/share/typora/resources/window.html`. (If fail to use this plugin system after installation, you can revert it back to the original file and try again.)
5. Modify `/usr/share/typora/resources/window.html`. Open the file with encoding UTF-8, then replace text `</body></html>` at the end of file as `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`.



**for macOS**

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `/Users/{UserName}/Library/Application Support/abnerworks.Typora/plugins`.（If the `plugins` folder does not exist, create it manually.）
4. Right click `Typora.app`, then click menu item "Show Package Contents" to open the app inner folder.
5. Backup `Typora.app/Contents/Resources/TypeMark/index.html`. (If fail to use this plugin system after installation, you can revert it back to the original file and try again.)
6. Modify `Typora.app/Contents/Resources/TypeMark/index.html`. Open the file with encoding UTF-8, then replace text `</body>` at the end of file as `<script src="file:///Users/{UserName}/Library/Application Support/abnerworks.Typora/plugins/loader.js" type="module"></script></body>`, and `{UserName}` need to be replaced with your current user name of macOS.



**PS:** After installation, [Ribbon](./3-ribbon.md) & [Multi File Tabs](./3-file-tabs.md) will be shown by default. You can hide them in the Setting Modal.



### When failed to install

After installation, if you can't see Ribbon and Multi File Tabs, please check the following steps:

- Open the developer tools, check if there is an error
  - Windows/Linux: Use <kbd>Shift</kbd>+<kbd>F12</kbd> to open the developer tools
  - macOS
    - In menu "Help" → "Enable Debugging", then right click the editor area, select "Inspect Element" to open developer tools
    - For macOS ≥ 13.3 and Typora ≥ 1.9, See [Debug in Typora](https://support.typora.io/Debug-Themes/).
- If there is some errors, please screenshot or copy the log and report it in [Issues][issues].
- If there is no error
  1. Modify the `loader.json` file, change `"debug":false` to `"debug":true`, then restart Typora
  2. Open the Console tab of the developer tools, filter logs by `core.js`
  3. Screenshot or copy the log, and report it in [Issues][issues].\



[issues]: https://github.com/typora-community-plugin/typora-community-plugin/issues
[release]: https://github.com/typora-community-plugin/typora-community-plugin/releases
