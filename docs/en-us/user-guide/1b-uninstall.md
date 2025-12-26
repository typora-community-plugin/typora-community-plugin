# How to uninstall

## Script uninstallation

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Run `uninstall-windows.ps1` or `uninstall-*.sh` (See `README.md` in `typora-community-plugin.zip` for details)


## Manual uninstallation

**for Windows**

1. Delete the folder `%UserProfile%/.typora/community-plugins`.
2. Delete the symlink `%UserProfile%/AppData/Roaming/Typora/plugins`.
3. Modify `{TyporaHome}/resources/window.html`. Open the file with encoding UTF-8, then delete the text `<script src="typora://app/userData/plugins/loader.js" type="module"></script>` at the end of file.

**for Linux**

1. Delete the folder `~/.config/Typora/plugins`.
2. Modify `/usr/share/typora/resources/window.html`. Open the file with encoding UTF-8, then delete the text `<script src="typora://app/userData/plugins/loader.js" type="module"></script>` at the end of file.

**for macOS**

1. Delete the folder `/Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins`.
2. Right click `Typora.app`, then click menu item "Show Package Contents" to open the app inner folder. Modify `Typora.app/Contents/Resources/TypeMark/index.html`. Open the file with encoding UTF-8, then delete the text `<script src="file:///Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins/loader.js" type="module"></script>` at the end of file, and `{UserName}` need to be replaced with your current user name of macOS.


[release]: https://github.com/typora-community-plugin/typora-community-plugin/releases
