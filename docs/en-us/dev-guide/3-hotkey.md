# Hotkey

Hotkeys are registered through commands; there is no separate binding API. Users can also modify or reset hotkeys in "Settings > Hotkeys".



## Registration

Fill in `hotkey` and `scope` in `registerCommand()`:

```ts
import { Plugin } from '@typora-community-plugin/core'

export default class extends Plugin {
  onload() {
    this.registerCommand({
      id: 'toggle-style',
      title: 'Toggle tag style',
      scope: 'editor',
      hotkey: 'Alt+Ctrl+T',
      callback: () => this.toggleTagStyle(),
    })
  }

  toggleTagStyle() {
    // ...
  }
}
```

Registered hotkeys are removed automatically when the plugin is unloaded.



## scope

| Value | Bound to | Use case |
| --- | --- | --- |
| `global` | The whole window | Global commands such as opening settings or toggling panes. |
| `editor` | The editor area | Commands such as editing text or formatting a selection. |

Hotkeys with the `editor` scope only fire while the editor has focus, avoiding conflicts with Typora or system shortcuts.



## Hotkey Format

- Use `+` to join modifier keys and the key, e.g. `Ctrl+Shift+P`, `Alt+Ctrl+T`.
- Modifier aliases are normalized:
  - `cmd` / `command` / `win` → `meta`
  - `ctrl` / `control` → `ctrl`
  - `opt` / `option` → `alt`
- Case-insensitive; the final key order is sorted before binding.
- Arrow keys are displayed as `↑`, `↓`, `←`, `→`.

For example, `Alt+Ctrl+T` and `ctrl+alt+t` are equivalent.



## Displaying Hotkeys

Internally, core uses `readableHotkey()` to convert normalized hotkeys into readable text (shows `Cmd` on macOS and `Win` on other platforms).

> `readableHotkey()` is currently not exported from the package entry. If you need to display hotkeys in your UI, follow its format yourself: capitalize the first letter of modifier keys and replace `meta` with `Cmd` on macOS or `Win` on other platforms.



## User-Modified Hotkeys

If a command sets `hotkey`, it appears in "Settings > Hotkeys", where users can:

- search and change the key combination;
- reset it to the default registered by the plugin.

Plugins do not need to implement their own hotkey settings UI. Changes are saved in `hotkeys.json` in the config directory.



## Relationship with the Command Palette

`showInCommandPanel: false` only affects whether the command appears in the command palette; it does not affect hotkey binding. For a command that is "hotkey-only and hidden from the command palette", write:

```ts
this.registerCommand({
  id: 'quick-toggle',
  title: 'Quick toggle',
  scope: 'editor',
  hotkey: 'Ctrl+Alt+Q',
  showInCommandPanel: false,
  callback: () => { /* ... */ },
})
```



## Examples

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-collapsible-section](https://github.com/typora-community-plugin/typora-plugin-collapsible-section)
