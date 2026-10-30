# Ribbon

The vertical icon bar on the left, used to switch between sidebar panels such as files, search, and outline. It is also where plugins add their entries.

## Preview

![ribbon](../../assets/user/ribbon.jpg)

## Where to find it

Shown by default after installation. To hide or restore it: Plugin Settings modal → [Appearance](./3b-appearance.md) → Advanced → "Show Ribbon".

## Buttons

| Icon | Tooltip | Effect |
|------|----------|------|
| Magnifying glass | Search file content | Show/switch to the search panel |
| Folder | Files | Show/switch to the file tree |
| List | Outline | Show/switch to Typora's outline |
| Gear (at the bottom) | Settings | Open the quick menu, see below |

Plugins can also register their own Ribbon buttons (for example, the tag plugin); these appear alongside the built-in buttons.

### Switch panels

- **Left-click** an icon to show the corresponding sidebar; clicking the currently active icon again **collapses** the sidebar.
- The currently active icon is highlighted.

### Manage icons

- **Right-click** the icon area: a menu appears where you can check or clear each icon to show or hide it.
- **Drag** icons up or down to reorder them; the order is saved when you release and persists across launches.
- Hidden icons do not take up space in the Ribbon.

### Bottom gear menu

Click the gear icon at the bottom to open a menu with two items:

| Menu item | Effect |
|--------|------|
| Open App Settings | Open Typora's native preferences |
| Open Plugin Settings (Global) / Open Plugin Settings (Vault) | Open the Plugin Settings modal; the parentheses show the currently active settings mode |

The text of the second item changes with the current settings mode; it is equivalent to <kbd>Ctrl</kbd>+<kbd>.</kbd>.

## Notes and limitations

- After the Ribbon is hidden, sidebar panels can still be opened through Typora's native entries or the [Command Panel](./6-command-palette.md).
- Icon visibility and order are saved in the currently active settings; after switching to "Vault Settings", they are a separate configuration.
- The Ribbon depends on the custom sidebar panel mechanism. Turning off "Show Ribbon" also disables that mechanism, so sidebar entries registered by plugins are no longer shown.

## Related pages

- [Appearance](./3b-appearance.md)
- [Workspace](./4a-workspace.md)
- [Right Sidebar](./4d-right-panel.md)
