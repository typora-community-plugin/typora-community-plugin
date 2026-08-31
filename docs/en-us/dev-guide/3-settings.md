# Settings

Configure the plugin on the settings page, with persistence used for configuration to the configuration file.

Shortcut keys do not need to add their own settings interface, unified in "Settings" > "Shortcuts".


## Storage

Use the Plugin's `registerSettings()` to register a `PluginSettings` instance.

Then you can automatically access the `PluginSettings` instance through the Plugin's `settings`.


### Creation and Registration

```typescript
import { Plugin, PluginSettings } from '@typora-community-plugin/core'

export class MyPlugin extends Plugin {
  registerSettings() {
    this.registerSettings(new PluginSettings(this.app, this.manifest, {
      version: 1,
    }))
  }
}
```


### Reading and Writing Configuration

Read with `settings.get()` and write with `settings.set()`.

```typescript
// Read (supports nested paths)
const theme = this.settings.get('theme')        // 'light'
const timeout = this.settings.get(['network', 'timeout'])  // 30

// Write (automatically triggers persistence)
this.settings.set('theme', 'dark')
this.settings.set(['network', 'timeout'], 60)
```


### Listening for Changes

Use `onChange()` or `addChangeListener()` to listen for changes on specific keys or all keys.

```typescript
// Listen to a single key
const dispose = this.settings.onChange('theme', (key, value) => {
  console.log(`${key} changed to ${value}`)
})

// Listen to nested paths
this.settings.onChange(['network', 'timeout'], (key, value) => {
  // ...
})

// Listen to all keys
this.settings.onChange('*', (key, value) => {
  // ...
})

// Remove listener
dispose()
```


### Persistence Mechanism

- **Storage location**: `<configDir>/data/<pluginId>.json` (`<configDir>` is the global config directory or vault-level `.typora/`)
- **File format**: JSON, containing `version` and `settings` two-level structure
- **Auto-save**: Each `set()` call triggers a debounced save (1 second delay), no manual call needed


### Version Migration

When the configuration structure has breaking changes, increment `version` and use `SettingMigrations` for data migration.

```typescript
import { Plugin, PluginSettings, SettingMigrations } from '@typora-community-plugin/core'

const migrations = new SettingMigrations()
  .addMigration(1, 2, (old) => ({
    theme: old.settings.theme === 'dark' ? 'night' : 'day',
    apiKey: old.settings.apiKey,
  }))

export class MyPlugin extends Plugin {
  registerSettings() {
    this.registerSettings(new PluginSettings(this.app, this.manifest, {
      version: 2,
      migrations,
    }))
  }
}
```


## Interface

See [3-settings-ui](./3-settings-ui).


## Examples

- [typora-plugin-codeblock-highlight-mapper](https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper)
- [typora-plugin-file-icon](https://github.com/typora-community-plugin/typora-plugin-file-icon)
- [typora-plugin-front-matter](https://github.com/typora-community-plugin/typora-plugin-front-matter)
- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets)
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink)
