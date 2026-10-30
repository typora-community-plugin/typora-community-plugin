# How to uninstall

Uninstalling removes the plugin system's startup script, and Typora returns to its native interface.

## Before you uninstall

1. Quit Typora.
2. Download `typora-community-plugin.zip` from [Release][release].
3. Unzip the file.

## Script uninstallation

1. Run `uninstall-windows.ps1` (Windows) or `uninstall-*.sh` (Linux / macOS).
2. Follow the prompts in the script to finish the uninstallation.

For detailed usage, see `README.md` in `typora-community-plugin.zip`.

## Manual uninstallation

**Windows**

1. Delete the folder `%UserProfile%\.typora\community-plugins`.
2. Delete the symbolic link `%UserProfile%\AppData\Roaming\Typora\plugins`.
3. Modify `{Typora installation directory}/resources/window.html`. Open `window.html` with UTF-8 encoding (otherwise you may see a [white screen][ws]) and delete the text `<script src="typora://app/userData/plugins/loader.js" type="module"></script>` that was added near the end of the file.

**Linux**

1. Delete the folder `~/.config/Typora/plugins`.
2. Modify `/usr/share/typora/resources/window.html`. Open `window.html` with UTF-8 encoding (otherwise you may see a [white screen][ws]) and delete the text `<script src="typora://app/userData/plugins/loader.js" type="module"></script>` that was added near the end of the file.

**macOS**

1. Delete the folder `/Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins`.
2. Right-click `Typora.app`, click "Show Package Contents", open the app's internal folder, and modify `Typora.app/Contents/Resources/TypeMark/index.html`. Open `index.html` with UTF-8 encoding (otherwise you may see a [white screen][ws]) and delete the text `<script src="file:///Users/{UserName}/Library/Application%20Support/abnerworks.Typora/plugins/loader.js" type="module"></script>` that was added near the end of the file, where `{UserName}` is your macOS account name.

## Notes and limitations

- Uninstalling does not delete your notes, but it also deletes **community plugins**, **global settings**, and **hotkey bindings** in the plugin directory. If you want to keep your configuration, copy the plugin directory first.
- The `.typora` directory inside a vault (vault settings, vault plugins) is not removed by uninstallation; delete it manually.

## Related pages

- [How to install](./1a-installation.md)
- [Settings overview](./3-settings.md)

[release]: https://github.com/typora-community-plugin/typora-community-plugin/releases
[ws]: https://github.com/typora-community-plugin/typora-community-plugin/issues/9
