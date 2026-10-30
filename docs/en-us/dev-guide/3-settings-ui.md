# Settings UI

Use `registerSettingTab()` to register a settings page extending `SettingTab`.

Override the `onshow()` method in the subclass to build/refresh the settings form, and add setting rows with `addSetting()`.



## Create a Settings Page

The `SettingTab` constructor takes no arguments and holds no `app` / `plugin` / `settings`. The recommended approach is to pass the plugin instance in through a custom constructor:

```ts
import { SettingTab } from '@typora-community-plugin/core'

class MySettingsTab extends SettingTab {

  constructor(private plugin: MyPlugin) {
    super()
  }

  get name() {
    return this.plugin.manifest.name
  }

  onshow() {
    this.containerEl.innerHTML = ''
    this.render()
  }

  private render() {
    this.addSettingTitle('General')

    this.addSetting(setting => {
      setting.addName('Enable feature')
      setting.addDescription('Turn this feature on')
    })
  }
}
```

Then register it in `onload()`:

```ts
import { Plugin, PluginSettings } from '@typora-community-plugin/core'

export default class MyPlugin extends Plugin {
  onload() {
    this.registerSettings(new PluginSettings(this.app, this.manifest, { version: 1 }))
    this.registerSettingTab(new MySettingsTab(this))
  }
}
```

After registration, the settings page appears under the "Plugins" group of the settings modal.



## SettingTab

```ts
abstract class SettingTab extends View {
  abstract get name(): string
  pill?: string | number
  containerEl: HTMLElement

  constructor()

  addSettingTitle(text: string): void
  addSetting(build: (setting: SettingItem) => void): void

  show(): void
  onshow(): void
  hide(): void
  onhide(): void
}
```

| Member | Description |
| --- | --- |
| `name` | Name shown in the sidebar for this settings page; must be implemented. |
| `pill` | Optional small badge shown next to the name. |
| `containerEl` | Settings page root element (`.typ-setting-tab`). Clear it with `innerHTML = ''` when refreshing. |
| `addSettingTitle(text)` | Add a group title (`<h3>`). |
| `addSetting(build)` | Create a setting row and hand it to `build` for configuration. |
| `onshow()` | Called when the settings page is shown; build or refresh the form here. |
| `onhide()` | Called when the settings page is hidden; useful for cleanup. |

> When registering a settings page, core still calls `onload()` for compatibility with the old API; new code should use `onshow()` / `onhide()` to build and clean up the UI.



## SettingItem

Each `addSetting()` callback receives a `SettingItem`:

| Method | Description |
| --- | --- |
| `addTitle(text \| build)` | Add a title in the info area. Usually use `SettingTab.addSettingTitle()` instead. |
| `addName(text \| build)` | Add the setting name. |
| `addBadge(text \| build)` | Append a `<code>` badge after the name; creates an empty name automatically if `addName()` was not called. |
| `addDescription(text \| build)` | Add description text; accepts a string or custom HTML. |
| `addCheckbox(build)` | Add a checkbox in the control area before the name. |
| `addCheckbox({ settings, bindingKey })` | Bound checkbox: automatically reads and writes back the given settings key. |
| `addButton(build)` | Add a button in the control area after the name. |
| `addInput(type, build)` | Add an input of the given type. |
| `addText(build)` | Equivalent to `addInput('text', build)`. |
| `addTextArea(build)` | Add a multi-line textarea in the info area. |
| `addSelect(options \| build)` | Add a select (`@beta`). |
| `addTag(text, build?)` | Add a tag, placed first in the control area after the name. |
| `addRemovableTag(text, onClose?)` | Add a tag with a close button. |
| `addTable(build)` | Add an editable table (`@beta`). |
| `addSidebarLayout(options, onSelect)` | Add a "sidebar + panel" layout (`@beta`). |



### Input Controls

```ts
this.addSetting(setting => {
  setting.addName('API key')
  setting.addText(input => {
    input.type = 'password'
    input.value = this.plugin.settings.get('apiKey') ?? ''
    input.onchange = () => this.plugin.settings.set('apiKey', input.value)
  })
})

this.addSetting(setting => {
  setting.addName('Timeout (seconds)')
  setting.addInput('number', input => {
    input.value = String(this.plugin.settings.get('timeout') ?? 30)
    input.onchange = () => this.plugin.settings.set('timeout', Number(input.value))
  })
})
```



### Bound Checkbox

The most common on/off settings can be bound directly:

```ts
this.addSetting(setting => {
  setting.addName('Enable feature')
  setting.addDescription('Stop processing documents when disabled')
  setting.addCheckbox({
    settings: this.plugin.settings,
    bindingKey: 'enabled',
  })
})
```

Equivalent to reading and writing manually:

```ts
setting.addCheckbox(cb => {
  cb.checked = this.plugin.settings.get('enabled') ?? false
  cb.onchange = () => this.plugin.settings.set('enabled', cb.checked)
})
```



### Select

> **@beta**

The declarative form only supports string options, and `selected` is required:

```ts
setting.addSelect({
  options: ['light', 'dark', 'auto'],
  selected: this.plugin.settings.get('theme') ?? 'auto',
  onchange: event => this.plugin.settings.set('theme', event.target.value),
})
```

Use the builder form for dynamic options or custom values/labels:

```ts
setting.addSelect(select => {
  for (const folder of folders) {
    const option = document.createElement('option')
    option.value = folder.path
    option.textContent = folder.name
    select.append(option)
  }
  select.value = this.plugin.settings.get('folder') ?? ''
  select.onchange = () => this.plugin.settings.set('folder', select.value)
})
```



### Editable Table

> **@beta**

Only columns with a `type` render an input in the editing row:

```ts
setting.addTable(table => {
  table.setHeaders([
    { title: 'Name', prop: 'name', type: 'text' },
    { title: 'Value', prop: 'value', type: 'text' },
  ])
  table.setData(this.plugin.settings.get('items') ?? [])

  table.onRowChange(row => {
    // row is the object of the current row, not { data }
    console.log('changed row:', row)
  })
  table.onRowRemove(row => {
    console.log('removed row:', row)
  })
})
```

`EditableTable` also provides `getData()`, `setData()`, `setHeaders()`, `onRowChange()`, and `onRowRemove()`. Table data is not persisted automatically; write it to settings in the callbacks.



### Sidebar Layout

> **@beta**

The object returned by `addSidebarLayout()` lets you add or remove left-hand items dynamically:

```ts
const layout = setting.addSidebarLayout(
  { items: ['General', 'Advanced'], initialActive: 'General' },
  ({ item, panelEl, panel }) => {
    if (item === 'General') {
      panel.addSetting(row => {
        row.addName('Enabled')
        row.addCheckbox({
          settings: this.plugin.settings,
          bindingKey: 'enabled',
        })
      })
      return
    }

    // you can also operate on panelEl directly
    panelEl.innerHTML = '<p>Advanced options</p>'
  })

layout.addItem('Experimental')
layout.removeItem('General')
layout.setItems(['A', 'B'])
```



## Complete Example

```ts
import { Plugin, PluginSettings, SettingTab } from '@typora-community-plugin/core'

type Settings = {
  enabled: boolean
  apiKey: string
  theme: string
  timeout: number
}

class MySettingsTab extends SettingTab {

  constructor(private plugin: MyPlugin) {
    super()
  }

  get name() {
    return this.plugin.manifest.name
  }

  onshow() {
    this.containerEl.innerHTML = ''
    this.render()
  }

  private render() {
    this.addSettingTitle('General')

    this.addSetting(setting => {
      setting.addName('Enable feature')
      setting.addDescription('Turn this feature on')
      setting.addCheckbox({
        settings: this.plugin.settings,
        bindingKey: 'enabled',
      })
    })

    this.addSetting(setting => {
      setting.addName('API key')
      setting.addText(input => {
        input.type = 'password'
        input.value = this.plugin.settings.get('apiKey') ?? ''
        input.onchange = () => this.plugin.settings.set('apiKey', input.value)
      })
    })

    this.addSettingTitle('Advanced')

    this.addSetting(setting => {
      setting.addName('Theme')
      setting.addSelect({
        options: ['light', 'dark', 'auto'],
        selected: this.plugin.settings.get('theme') ?? 'auto',
        onchange: event => this.plugin.settings.set('theme', event.target.value),
      })
    })

    this.addSetting(setting => {
      setting.addName('Timeout (seconds)')
      setting.addInput('number', input => {
        input.value = String(this.plugin.settings.get('timeout') ?? 30)
        input.onchange = () => this.plugin.settings.set('timeout', Number(input.value))
      })
    })
  }
}

export default class MyPlugin extends Plugin {
  onload() {
    this.registerSettings(new PluginSettings<Settings>(this.app, this.manifest, { version: 1 }))
    this.registerSettingTab(new MySettingsTab(this))
  }
}
```



## Examples

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets)
