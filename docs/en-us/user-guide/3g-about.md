# About

View the plugin system version, check for updates, open the changelog, and switch the UI language.

## Preview

![About](../../assets/user/settings-about.jpg)

## Where to find it

Plugin Settings modal (<kbd>Ctrl</kbd>+<kbd>.</kbd>) → About.

## Page elements

| Element | Description |
|------|------|
| Version | The currently installed plugin system version, e.g. `Version: v2.10.70` |
| Build Time | Packaging time of this version |
| Author | Project author |
| Homepage | Click to open the project repository |
| "Update" | Check for and install a new version; shows "Typora Community Plugin is up to date." if already current |
| "Changelog" | Download and expand `CHANGELOG.md`; shows "Loading…" on first load and changes to "Collapse" when expanded |
| Automatically Check for Updates | Enabled by default; checks once the first time you open this modal after each launch |
| Language | Switch the plugin system UI language; options come from the available translations |

When a new version is detected, "Update available" appears next to the title (hover to see the latest version number), and a `New` badge appears next to "About" in the sidebar.

## Steps

### Upgrade to a new version

1. Open this page and click "Update".
2. Wait for the download and replacement to finish; the UI shows "Typora Community Plugin update successful. (Need to relaunch Typora)".
3. Restart Typora.

See [Upgrading the plugin](./1c-update.md) for details.

### Switch the UI language

1. Select the target language in the "Language" dropdown (e.g. "简体中文").
2. Restart Typora so all UI text updates.

See [Switching languages](./5-i18n.md) for details.

### Turn off automatic update checks

Clear "Automatically Check for Updates". Version information is no longer requested automatically, and the "Update available" and `New` badges disappear, but you can still click "Update" manually.

## Notes and limitations

- "Update" downloads from Github and may fail when the network is restricted. You can change the Github proxy in [Plugin Marketplace](./3e-plugin-marketplace.md) first.
- The changelog is fetched online; if the repository does not provide one, it shows "No changelog found in this repository.".
- "Language" only affects the plugin system's own UI (settings modal, Ribbon tooltips, search result header, etc.) and does not change Typora's native menu language.

## Related pages

- [Upgrading the plugin](./1c-update.md)
- [Switching languages](./5-i18n.md)
- [Plugin Marketplace](./3e-plugin-marketplace.md)
