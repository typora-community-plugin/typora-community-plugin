# Shortcuts Settings


## Open Settings Page

- Press <kdb>F1</kdb> to open the command panel
- Type `Settings` to find the command
- Click the command, then select the `Shortcuts` tab in the left navigation bar


## Add Shortcuts

Commands provided by Typora Community Plugin are listed on this page. If a command has not yet been bound to a shortcut:

- Click the <span class="fa fa-plus primary"></span> button next to the command name
- The button text will change to "Press shortcut key..."
- Press the key combination you want to bind (e.g., `Ctrl+Shift+K`)


## Remove Shortcuts

If a command has bound to a shortcut:

- Click the `<kbd>` icon on the right side of the shortcut label to remove it
- After removal, the <span class="fa fa-plus primary"></span> button will reappear, allowing you to rebind


## Shortcut Format

Shortcuts connect modifier keys and the main key with `+`, for example: `Ctrl+Shift+K`. The system automatically normalizes them:

| Input | Normalized (Windows/Linux) | Normalized (macOS) |
|-------|---------------------------|---------------------|
| `ctrl+k` | `Ctrl+K` | - |
| `meta+k`, `command+k`, `cmd+k` | `Win+K` | `Cmd+K` |
| `alt+k`, `option+k` | `Alt+K` | `Opt+K` |

Commands are divided into two scopes: **Global** (works in all areas of Typora) and **Editor** (only works when focus is inside the editor). The scope is defined by each plugin. Shortcut configurations are stored in each plugin's config file and automatically loaded on next startup.
