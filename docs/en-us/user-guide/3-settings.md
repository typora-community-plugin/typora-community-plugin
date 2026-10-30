# Settings overview

The Plugin Settings modal (<kbd>Ctrl</kbd>+<kbd>.</kbd>) is the central place for all plugin system settings. There are two sets of settings, **global settings** and **vault settings**; only one is active at a time.

## Preview

![Settings overview](../../assets/settings-modal.jpg)

## Open settings

- Press <kbd>Ctrl</kbd>+<kbd>.</kbd> (also <kbd>Ctrl</kbd> on macOS).
- Or press <kbd>F1</kbd> to open the [Command Panel](./6-command-palette.md) and run "Open Plugin Settings Modal".
- Or click the gear icon at the bottom of the [Ribbon](./4b-ribbon.md) → "Open Plugin Settings (Global)" / "Open Plugin Settings (Vault)".

The modal title shows whether "Global Settings" or "Vault Settings" is currently active.

## Modal layout

| Area | Description |
|------|------|
| Search box at the top | Placeholder "Filter settings..."; filters the left list by **settings page name**, not by individual settings |
| Core | 7 built-in settings pages, listed below |
| Core Plugins | Settings pages provided by core plugins; currently only "Workspace" (enable Workspace first) |
| Community Plugins | Settings pages provided by enabled community plugins, sorted alphabetically by name |

| Core settings page | What it controls |
|------------|--------|
| [File & Link](./3a-file-and-link.md) | How links open, the quick open panel |
| [Appearance](./3b-appearance.md) | Unsupported files, search panel, Ribbon visibility |
| [Hotkey](./3c-hotkey.md) | Bind shortcuts to commands |
| [Core Plugins](./3d-internal-plugins.md) | Enable or disable core plugins |
| [Plugin Marketplace](./3e-plugin-marketplace.md) | Browse and install community plugins |
| [Installed Plugins](./3f-installed-plugins.md) | Enable, update, uninstall community plugins |
| [About](./3g-about.md) | Version, updates, language |

The modal opens on "File & Link" by default. Press <kbd>Esc</kbd> or click outside the modal to close it.

## Use vault settings

By default, all vaults share the global settings. To give the current vault its own configuration:

**Option 1: Create it manually**

Create a directory named `.typora` in the current vault directory and write your settings there. The next time you open the modal, the title changes to "Vault Settings".

**Option 2: Use the Command Panel**

1. Press <kbd>F1</kbd> to open the Command Panel.
2. Type `Use vault settings` and run "Use vault settings (add `.typora` to vault)".
3. The plugin system **copies** the global settings into the vault's `.typora` directory and switches to vault settings immediately.

## Switch back to global settings

**Option 1: Delete it manually**

Delete the `.typora` directory in the current vault directory.

**Option 2: Use the Command Panel**

1. Press <kbd>F1</kbd> to open the Command Panel.
2. Type `Use global settings` and run "Use global settings (remove `.typora` from vault)".
3. The vault settings directory is deleted, and global settings are used afterward.

## Notes and limitations

- Settings, shortcuts, enabled plugins, and installed vault plugins are **two independent data sets** in the two modes; the UI may look noticeably different after switching.
- "Use vault settings" copies rather than migrates: later changes to global settings do not affect vaults that have switched to vault settings.
- "Use global settings" **directly deletes** the vault's `.typora` directory; vault plugins and configuration in it are not kept.
- When you switch vaults (open another folder), the plugin system chooses the settings set again based on whether that vault contains `.typora`, and the UI reloads.

## Related pages

- [Hotkey settings](./3c-hotkey.md)
- [Core Plugins](./3d-internal-plugins.md)
- [Plugin installation](./2-plugin-installation.md)
