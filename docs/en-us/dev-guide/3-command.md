# Command

The command palette can be opened with the default shortcut <kbd>F1</kbd>.



## Register a Command

Use `registerCommand()` in the `onload()` method of the plugin implementation class to register commands:

```ts
import { Plugin } from '@typora-community-plugin/core'

export default class extends Plugin {
  onload() {
    this.registerCommand({
      id: 'fold-all',
      title: 'Fold all',
      scope: 'editor',
      hotkey: 'Alt+Ctrl+T',
      callback: () => {
        // implement the command
      },
    })
  }
}
```

Registered commands are removed automatically when the plugin is unloaded.



## Command

```ts
type Command = {
  id: string
  title: string
  scope: 'global' | 'editor'
  hotkey?: string | null
  /** @default true */
  showInCommandPanel?: boolean
  /** Must support being called without any arguments */
  callback: (...args: any[]) => void
}
```

| Field | Description |
| --- | --- |
| `id` | Command id. After registration the actual id becomes `<manifest.id>:<command.id>`. |
| `title` | Command title. After registration the actual title becomes `<manifest.name>: <command.title>`. |
| `scope` | `global` binds the hotkey across the whole window; `editor` binds it only within the editor area. |
| `hotkey` | Optional shortcut, such as `Alt+Ctrl+T`. It is normalized before binding; see [Hotkeys](./3-hotkey.md). |
| `showInCommandPanel` | Whether to show the command in the command palette. Defaults to `true`. When `false`, the command can still be triggered via `app.commands.run()` or a hotkey. |
| `callback` | Command execution function. The command palette may call it without arguments, so do not rely on required parameters. |

> **Note**: `registerCommand()` returns `void`. Removal on unload is handled by `this.register()`; you do not need to unbind manually.



## Run a Command

Commands registered by plugins must be run with the fully prefixed id:

```ts
this.app.commands.run(`${this.manifest.id}:fold-all`)
```

Core built-in commands are run with their original names, for example:

```ts
this.app.commands.run('settings:open')
this.app.commands.run('core.workspace:split-right')
```



## CommandManager

Accessed via `app.commands`:

| Method | Description |
| --- | --- |
| `register(command)` | Register a command and return an unregister function. Plugins usually use `this.registerCommand()` instead. |
| `unregister(command)` | Unregister a command. |
| `run(commandId, args?)` | Run a command; does nothing if it does not exist, and logs errors thrown by the callback. |
| `getRecentCommandIds()` | Get the ids of recently executed commands (at most 5). |
| `setCommandHotkey(commandId, hotkey)` | Change a command's hotkey and persist it; pass `null` to remove it. |
| `resetCommandHotkey(commandId)` | Restore the default hotkey registered by the plugin. |

Command hotkeys are stored in `hotkeys.json` in the config directory. User changes made in "Settings > Hotkeys" are read on the next launch.



## Examples

- [typora-plugin-collapsible-section](https://github.com/typora-community-plugin/typora-plugin-collapsible-section)
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
