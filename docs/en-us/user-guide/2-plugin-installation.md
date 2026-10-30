# Plugin installation

Plugins can be installed in two locations: **global** (shared by all vaults) or **vault** (only applies to the folder currently open).

## Preview

![Plugin Marketplace](../../assets/plugin-marketplace.jpg)

## Install from the Plugin Marketplace

1. Launch Typora.
2. Open the Plugin Settings modal (<kbd>Ctrl</kbd>+<kbd>.</kbd>) → [Plugin Marketplace](./3e-plugin-marketplace.md).
3. Enter a plugin name in "Search plugins:" and find the plugin you want.
4. Click the install button on the card:
   - **Global**: installs to `.typora/community-plugins/plugins` in your user directory.
   - **Vault**: installs to `.typora/plugins` in the current vault.
5. When installation succeeds, it shows `The plugin "{name}" has been installed successfully.` and the install button disappears from the card.
6. Enable it as described in "Enable a plugin" below.

> The "Vault" button only appears when the current vault uses [vault settings](./3-settings.md). If you only see the "Global" button, the current mode is global settings.

## Manual installation

Use this for offline environments, or for plugins that are not listed in the marketplace.

1. Close Typora.
2. Download the plugin archive.
3. Extract the archive into the plugin directory:
   - Global: `.typora/community-plugins/plugins/{plugin-id}` in your user directory.
   - Vault: `.typora/plugins/{plugin-id}` in the current vault.
4. Launch Typora.
5. Enable the plugin.

> After extracting, you should see `manifest.json` directly, not an extra nested folder.

## Enable a plugin

1. Open the Plugin Settings modal → [Installed Plugins](./3f-installed-plugins.md).
2. Check the checkbox next to the plugin to enable it, or clear it to disable it.
3. No restart is needed; the commands, panels, and settings pages declared by the plugin appear immediately.

If enabling fails, it shows `Plugin "{name}" requires a newer version of Typora Community Plugin. Please check for updates.` In that case, [upgrade the plugin](./1c-update.md) first.

## Update a plugin

1. Open the Plugin Settings modal → Installed Plugins.
2. The page checks for updatable versions automatically; the badge next to "Installed Plugins" shows how many updates are available.
3. Plugins with a new version show an "Update" button on the right; click it to upgrade.
4. If there is no "Update" button, the plugin is already up to date.

A successful update shows `The plugin "{name}" has been updated successfully.`; if it is already up to date, it shows `Plugin "{name}" is up to date.`.

## Uninstall a plugin

1. Open the Plugin Settings modal → Installed Plugins.
2. Click the "Uninstall" button on the right side of the plugin.

> Uninstalling has **no confirmation step**: clicking immediately removes the plugin directory (moves it to the system trash) and takes effect in the current session. The plugin's data files are not deleted automatically.

## FAQ

| Symptom | What to do |
|------|------|
| Download fails with "Download failed. You can retry later." | Switch to another Github proxy in [Plugin Marketplace](./3e-plugin-marketplace.md) and retry |
| `Downloaded plugin "{name}" id is not equal to user install plugin id.` | A plugin with the same id already exists locally from a different source; uninstall the old one in Installed Plugins first |
| The marketplace list stays at "Plugin List (0 plugins)" | The network is unreachable; switch proxies or retry later. Manual installation is unaffected |
| Features do not appear after enabling | Make sure the plugin is checked. Some plugins require restarting Typora or depend on other plugins (such as [Metadata](./3d-internal-plugins.md)) |

## Related pages

- [Plugin Marketplace](./3e-plugin-marketplace.md)
- [Installed Plugins](./3f-installed-plugins.md)
- [Settings overview](./3-settings.md)
