# How to install

After installing Typora Community Plugin, Typora loads the plugin system automatically on startup and adds a Ribbon, file tabs, a right sidebar, and the plugin settings entry to the UI.

## Before you install

1. Quit Typora.
2. Download `typora-community-plugin.zip` from [Release][release].
3. Unzip the file.

> Manual installation requires modifying files inside the Typora installation directory. Back up `window.html` first so you can restore it and retry if the installation fails.

## Script installation

1. Run `install-windows.ps1` (Windows) or `install-*.sh` (Linux / macOS).
2. Follow the prompts in the script to finish the installation.
3. Launch Typora.

For detailed usage, see `README.md` in `typora-community-plugin.zip`.

## Manual installation

**Windows**

1. Copy the unzipped files to `%UserProfile%\.typora\community-plugins`.
   > `%UserProfile%` is your user directory, `C:\Users\{username}\`.
2. Create a symbolic link for the folder. Run `cmd` as administrator, then run
   `mklink /d %UserProfile%\AppData\Roaming\Typora\plugins %UserProfile%\.typora\community-plugins`.
3. Back up `{Typora installation directory}/resources/window.html`. (If the modification does not work, restore the file and try again.)
4. Modify `{Typora installation directory}/resources/window.html`. Open `window.html` with UTF-8 encoding (otherwise you may see a [white screen][ws]) and replace the text `</body></html>` at the end of the file with `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`.

**Linux**

1. Copy the unzipped files to `~/.config/Typora/plugins`.
2. Back up `/usr/share/typora/resources/window.html`. (If the modification does not work, restore the file and try again.)
3. Modify `/usr/share/typora/resources/window.html`. Open `window.html` with UTF-8 encoding (otherwise you may see a [white screen][ws]) and replace the text `</body></html>` at the end of the file with `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`.

**macOS**

1. Copy the unzipped files to `/Users/{UserName}/Library/Application Support/abnerworks.Typora/plugins` (if the `plugins` folder does not exist, create it manually).
2. Right-click `Typora.app`, click "Show Package Contents", and open the app's internal folder.
3. Back up `Typora.app/Contents/Resources/TypeMark/index.html`. (If the modification does not work, restore the file and try again.)
4. Modify `Typora.app/Contents/Resources/TypeMark/index.html`. Open `index.html` with UTF-8 encoding (otherwise you may see a [white screen][ws]) and replace the text `</body>` at the end of the file with `<script src="file:///Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins/loader.js" type="module"></script></body>`, where `{UserName}` is your macOS account name.

## Verify the installation

When the installation succeeds:

- A **Ribbon** appears on the left side of the window, and **file tabs** appear above the editor.
- Pressing <kbd>Ctrl</kbd>+<kbd>.</kbd> opens the **Plugin Settings modal**.

If you do not want these UI elements:

- Hide the Ribbon: Plugin Settings modal → [Appearance](./3b-appearance.md) → Advanced → clear "Show Ribbon".
- Turn off multiple tabs: Plugin Settings modal → [Core Plugins](./3d-internal-plugins.md) → clear "Workspace".

## When installation fails

If the Ribbon and file tabs do not appear after installation, check the following:

1. Open Developer Tools and look for errors:
   - Windows / Linux: press <kbd>Shift</kbd>+<kbd>F12</kbd>.
   - macOS: in the menu bar, go to "Help" → "Enable Debugging", then right-click the editor area and select "Inspect Element". For macOS ≥ 13.3 and Typora ≥ 1.9, see [How to Debug in Typora](https://support.typoraio.cn/Debug-Themes/).
2. If there are errors, take a screenshot or copy the log and report it on [Issues][issues].
3. If there are no errors, check the following in order:
   - Confirm that `loader.js` is in the plugin directory and that the plugin directory path matches the `<script src=...>` you added to `window.html`.
   - Confirm that `window.html` was saved with UTF-8 encoding and that the added `<script>` tag at the end was not escaped.
   - Change `"debug":false` to `"debug":true` in `loader.json`, then restart Typora.
   - Open the Console tab in Developer Tools and type `core.js` in the Filter box to filter the logs.
   - Take a screenshot or copy the log and report it on [Issues][issues].

## Related pages

- [Upgrading the plugin](./1c-update.md)
- [How to uninstall](./1b-uninstall.md)
- [Plugin installation](./2-plugin-installation.md)

[issues]: https://github.com/typora-community-plugin/typora-community-plugin/issues
[release]: https://github.com/typora-community-plugin/typora-community-plugin/releases
[ws]: https://github.com/typora-community-plugin/typora-community-plugin/issues/9
