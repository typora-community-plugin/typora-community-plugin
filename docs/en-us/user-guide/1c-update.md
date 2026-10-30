# Upgrading the plugin

Typora Community Plugin can download and replace its own files, so you do not need to run the installation script again.

## Preview

![Update entry on the About page](../../assets/user/settings-about.jpg)

## Where to upgrade

Plugin Settings modal (<kbd>Ctrl</kbd>+<kbd>.</kbd>) → [About](./3g-about.md) → click "Update".

## Manual upgrade

1. Open the Plugin Settings modal → About and check the current version number.
2. Click "Update".
3. Wait for the download to finish. The UI shows "Typora Community Plugin update successful. (Need to relaunch Typora)".
4. Restart Typora.

If you are already on the latest version, it shows "Typora Community Plugin is up to date." and does not download again.

## Automatic update checks

"Automatically Check for Updates" on the About page is enabled by default. When enabled, a check runs the first time you open the Plugin Settings modal after each Typora launch:

- New version available: a `New` badge appears next to "About" in the sidebar, and "Update available" appears next to the page title.
- No new version: nothing is shown.
- If you turn the option off, automatic checks stop and the badges disappear; you can still click "Update" manually.

## Viewing the changelog

The "Changelog" button on the About page downloads and expands this repository's `CHANGELOG.md`:

- The first click shows "Loading…"; when loading finishes, the button changes to "Collapse".
- If the repository has no changelog, it shows "No changelog found in this repository."
- The changelog content is fetched online. When offline, it opens blank; you can view [CHANGELOG](./CHANGELOG.md) instead.

## Notes and limitations

- Upgrading only replaces the plugin system's own files. **Community plugins are not upgraded with it**; update them separately in [Installed Plugins](./3f-installed-plugins.md).
- Downloads go through Github and may fail when the network is restricted. Try switching to another "Github proxy" in [Plugin Marketplace](./3e-plugin-marketplace.md) and retry.
- You must **restart Typora** after upgrading; otherwise the old version keeps running.

## Related pages

- [How to install](./1a-installation.md)
- [About](./3g-about.md)
- [Plugin installation](./2-plugin-installation.md)
