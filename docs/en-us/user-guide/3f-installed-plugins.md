# Installed Plugins

Manage community plugins already downloaded to your machine: enable, disable, update, and uninstall. Global plugins and plugins in the current vault are listed together here.

## Preview

![Installed Plugins](../../assets/user/settings-installed-plugins.jpg)

## Where to find it

Plugin Settings modal (<kbd>Ctrl</kbd>+<kbd>.</kbd>) → Installed Plugins. The badge number next to this page in the sidebar indicates **how many plugins can be updated**.

## Page elements

| Element | Description |
|------|------|
| Search plugins: | Filter installed plugins by name and description |
| Installed Plugin ({0} installed) | Total number currently installed |
| Checkbox | Check to enable, clear to disable; takes effect immediately |
| `Local Plugin` badge | Indicates the plugin is not in the marketplace list (installed manually or delisted); the badge text is English |
| Location / Version / Author | Indicates whether the plugin is installed globally or in the vault, plus the current version and author |
| `Repository` | Open the plugin's source repository |
| "Update" | **Only shown when a new version exists**; clicking it uninstalls and reinstalls, keeping the location and enabled state |
| "Uninstall" | Delete the plugin directory (move it to the system trash) |

## Steps

### Check for and install updates

Just open this page; the plugin system fetches the marketplace list and compares versions automatically. There is no "Check for updates" button:

- New version available: the badge at the top of the page shows the count, and the corresponding plugins show an "Update" button.
- No new version: no "Update" button appears.

After clicking "Update", it shows `The plugin "{name}" has been updated successfully.`; if it is already up to date, it shows `Plugin "{name}" is up to date.`.

### Disable without uninstalling

Clear the checkbox on the plugin card. After disabling, the commands, panels, and settings pages provided by the plugin disappear immediately, but the plugin files remain on disk and you can check it again at any time.

### Uninstall

Click the "Uninstall" button.

> **No confirmation step**: clicking runs immediately and moves the plugin directory to the trash. The plugin's own data files are not deleted.

## Notes and limitations

- Update detection requires a network connection. When offline, no "Update" button appears, but installed plugins can still be enabled normally.
- If a plugin requires a newer plugin system version, checking it is rejected with `Plugin "{name}" requires a newer version of Typora Community Plugin. Please check for updates.`.
- Uninstalling a plugin that is in use removes the panels it occupies; any unsaved UI state from that plugin is lost.
- Folders placed manually in the plugin directory without a valid `manifest.json` do not appear in the list.

## Related pages

- [Plugin installation](./2-plugin-installation.md)
- [Plugin Marketplace](./3e-plugin-marketplace.md)
- [Upgrading the plugin](./1c-update.md)
