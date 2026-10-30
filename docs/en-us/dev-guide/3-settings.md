# Settings

Configure plugins on a settings page and persist the configuration to a settings file.

Hotkeys do not need their own settings UI; they are all configured in "Settings > Hotkeys".



## Storage

Use `PluginSettings` to manage plugin configuration. It extends `Settings` and provides reading, writing, change listening, and auto-saving.

### Create and Register

Call `registerSettings()` in `onload()`:

```ts
import { Plugin, PluginSettings } from '@typora-community-plugin/core'

type MySettings = {
  enabled: boolean
  theme: 'light' | 'dark' | 'auto'
  network: {
    timeout: number
  }
}

export default class extends Plugin {
  onload() {
    this.registerSettings(new PluginSettings<MySettings>(this.app, this.manifest, {
      version: 1,
    }))
  }
}
```

Constructor signature:

```ts
new PluginSettings(app, manifest, {
  version: number,
})
```

The settings file is always `data/<manifest.id>`; you neither need to nor can specify `filename` yourself.

> **Note**: `Plugin.settings` is a getter. Accessing `this.settings` without calling `registerSettings()` throws immediately.



### Read and Write Configuration

Read with `settings.get()` and write with `settings.set()`. Both support nested paths:

```ts
// read
const theme = this.settings.get('theme')                  // 'light' (when a default is set)
const timeout = this.settings.get(['network', 'timeout']) // 30

// write (persisting is triggered automatically)
this.settings.set('theme', 'dark')
this.settings.set(['network', 'timeout'], 60)
```

> **Note**: `set()` does not fire a change or save when the value is equal. Writing the same object reference also does not fire; to modify nested fields, use a nested path or write a new object.



### Default Values

You can set defaults after registration:

```ts
this.registerSettings(new PluginSettings<MySettings>(this.app, this.manifest, { version: 1 }))
this.settings.setDefault({
  enabled: true,
  theme: 'auto',
  network: { timeout: 30 },
})
```

Missing keys resolve to their default values when read.



### Listening for Changes

Use `onChange()` to listen to a specific key or all keys:

```ts
// listen to a single key
const dispose = this.settings.onChange('theme', (key, value) => {
  console.log(`${key} changed to ${value}`)
})

// listen to a nested path
this.settings.onChange(['network', 'timeout'], (key, value) => {
  // ...
})

// listen to all keys
this.settings.onChange('*', (key, value) => {
  // ...
})

// stop listening
dispose()
```



### Persistence Mechanism

- **Storage location**: `<configDir>/data/<pluginId>.json`
  - By default the global config directory is used: `<Typora userData>/plugins/settings`;
  - If `.typora/` exists under the current notes folder, it automatically switches to the vault-level config `<vault>/.typora`.
- **File format**:

  ```json
  {
    "version": 1,
    "settings": {
      "enabled": true,
      "theme": "auto"
    }
  }
  ```

- **Auto-save**: each `set()` triggers a debounced save (1 second delay); no manual `save()` is needed.
- **Path**: `this.dataPath` returns the full path of this settings file.



### Version Field

`version` represents the structure version of the settings file. Core currently writes it to the file and reads it back on load, but `SettingMigrations` for automatic migration is not yet exported from the package entry, so third-party plugins cannot use migrations for now.

> When changing the settings structure, make your code tolerate old fields or perform a one-time conversion after loading.



## UI

See [Settings UI](./3-settings-ui.md) for how to build the settings UI.



## Examples

- [typora-plugin-codeblock-highlight-mapper](https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper)
- [typora-plugin-file-icon](https://github.com/typora-community-plugin/typora-plugin-file-icon)
- [typora-plugin-front-matter](https://github.com/typora-community-plugin/typora-plugin-front-matter)
- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets)
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink)
