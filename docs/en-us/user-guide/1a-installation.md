# How to install



### Script installation

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Run `install-windows.ps1` or `install-*.sh` (See `README.md` in `typora-community-plugin.zip` for details)



### Manual installation

**For Windows**

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `%UserProfile%/.typora/community-plugins`.
   > `%UserProfile%` is your user directory, e.g., `C:\Users\{username}\`
4. Create a symbolic link for the folder. Run `cmd` as administrator, then run: `mklink /d %UserProfile%\\AppData\\Roaming\\Typora\\plugins %UserProfile%\\.typora\\community-plugins`.
5. Backup `{Typora installation directory}/resources/window.html`. (If modifications don't work, restore the original file and try again.)
6. Modify `{Typora installation directory}/resources/window.html`. Open the file with UTF-8 encoding (otherwise [white screen][ws] may occur), then replace the text `</body></html>` at the end of the file with `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`.



**For Linux**

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `~/.config/Typora/plugins`.
4. Backup `/usr/share/typora/resources/window.html`. (If modifications don't work, restore the original file and try again.)
5. Modify `/usr/share/typora/resources/window.html`. Open the file with UTF-8 encoding (otherwise [white screen][ws] may occur), then replace the text `</body></html>` at the end of the file with `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`.



**For macOS**

1. Download [Release][release] `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `/Users/{UserName}/Library/Application Support/abnerworks.Typora/plugins` (If the `plugins` folder does not exist, create it manually.)
4. Right-click `Typora.app`, then click "Show Package Contents" to open the app's internal folder.
5. Backup `Typora.app/Contents/Resources/TypeMark/index.html`. (If modifications don't work, restore the original file and try again.)
6. Modify `Typora.app/Contents/Resources/TypeMark/index.html`. Open the file with UTF-8 encoding (otherwise [white screen][ws] may occur), then replace the text `</body>` at the end of the file with `<script src="file:///Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins/loader.js" type="module"></script></body>`, where `{UserName}` should be replaced with your macOS account name.



**PS:** After installation, [Ribbon](./4b-ribbon.md) and [Workspace][4a-workspace] multi-tab will be shown by default. You can hide them in the Settings page.



### When failed to install

After installation, if you can't see Ribbon and Workspace tabs, please check the following steps:

- Open Developer Tools and look for errors
  - Windows/Linux: Press <kbd>Shift</kbd>+<kbd>F12</kbd> to open Developer Tools
  - macOS
    - In the menu bar go to "Help" → "Enable Debugging", then right-click the editor area and select "Inspect Element" to open Developer Tools
    - For macOS ≥ 13.3 and Typora ≥ 1.9, see [How to Debug in Typora](https://support.typora.io/Debug-Themes/).
- If there are errors, take a screenshot or copy the log and report it on [Issues][issues].
- If there are no errors:
  1. Open `loader.json` and change `"debug":false` to `"debug":true`, then restart Typora
  2. Open the Console tab in Developer Tools, filter logs by typing `core.js` in the Filter box
  3. Take a screenshot or copy the log and report it on [Issues][issues].



[issues]: https://github.com/typora-community-plugin/typora-community-plugin/issues
[release]: https://github.com/typora-community-plugin/typora-community-plugin/releases
[ws]: https://github.com/typora-community-plugin/typora-community-plugin/issues/9
[4a-workspace]: ./4a-workspace.md
