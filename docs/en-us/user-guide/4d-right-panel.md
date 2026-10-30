# Right Sidebar

You can pull out a separate sidebar on the right side of the editor area to host auxiliary views provided by plugins. The core itself does not include any right-side views; all content comes from plugins.

> Requires v2.10+. Requires [Workspace](./3d-internal-plugins.md) to be enabled.

## Preview

![Right Sidebar](../../assets/user/right-panel.gif)

## Where to open it

On the right side of the status bar, to the left of "Word count", there is a "Toggle right sidebar" button (its icon is a right-aligned line). Click it to expand or collapse the sidebar.

## Operations

| Operation | How |
|------|------|
| Expand / collapse | Click the "Toggle right sidebar" button in the status bar |
| Resize | Drag the divider on the left edge of the sidebar |
| Auto-collapse | The sidebar collapses automatically when dragged below about 50 pixels wide |
| Restore width | Expanding it again returns to the previous width, with a minimum of 280 pixels |
| View an empty sidebar | If no plugin adds a view to the right sidebar, it shows "This sidebar is empty." |

## Notes and limitations

- After disabling [Workspace](./3d-internal-plugins.md), the toggle button in the status bar disappears and the right sidebar is unavailable.
- The sidebar width is saved in the currently active settings; the minimum width is fixed at 280 pixels and cannot be dragged narrower.
- What you see in the sidebar depends entirely on the enabled plugins. A single line "This sidebar is empty." just means no plugin uses it, which is normal.
- The right sidebar and the left Ribbon / sidebars do not affect each other and can be expanded at the same time.

## Related pages

- [Workspace](./4a-workspace.md)
- [Ribbon](./4b-ribbon.md)
- [Core Plugins](./3d-internal-plugins.md)
