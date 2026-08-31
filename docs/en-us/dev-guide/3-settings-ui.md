# Settings Tab

Use the Plugin's `registerSettingTab()` to register a class that extends `PluginSettingTab`.

Override the `onshow()` method in the subclass to display/refresh the settings form.

Add setting fields to the settings form through the `addSetting()` method.


## Creating a Settings Tab

The plugin needs to create a class extending `PluginSettingTab` and override the `name` getter:

```typescript
class MyPluginSettingsTab extends PluginSettingTab {
  get name() {
    return "My Plugin"
  }

  onshow() {
    // Build settings form
  }
}
```

Then register it in the Plugin:

```typescript
export class MyPlugin extends Plugin {
  registerSettings() {
    this.registerSettingTab(new MyPluginSettingsTab(this.app, this))
  }
}
```


## SettingTab API

### `addSettingTitle(text: string)`

Add a section title (`<h3>`).

```typescript
this.addSettingTitle("General")
```

### `addSetting(build: (setting: SettingItem) => void)`

Core method that creates a setting row and configures fields via a builder callback.

```typescript
this.addSetting(setting => {
  setting.addName("Enable Feature")
  setting.addDescription("Turn on this feature")
  setting.addCheckbox(cb => {
    cb.checked = this.settings.get('enabled')
    cb.onclick = () => this.settings.set('enabled', cb.checked)
  })
})
```


## SettingItem API

Each `addSetting()` callback receives a `SettingItem` instance with the following methods:

### `addName(name: string)`

Add the setting name (displayed in the info area).

### `addBadge(text: string)`

Add a badge label (`<code>`) after the name. If `addName()` hasn't been called, it automatically creates an empty name.

```typescript
setting.addName("Version")
setting.addBadge("v1.0.0")
// Or equivalently:
setting.addBadge("v1.0.0") // Automatically creates empty name
```

### `addDescription(description: string | ((div: HTMLElement) => void))`

Add description text, supporting strings or custom HTML builder.

```typescript
// Plain text description
setting.addDescription("This is a description")

// Custom HTML
setting.addDescription(div => {
  div.innerHTML = "<a href='https://example.com'>Link</a>"
})
```

### `addCheckbox(build: (checkbox: HTMLInputElement) => void)`

Add a checkbox, placed in the controls area **before** the name.

```typescript
setting.addCheckbox(cb => {
  cb.checked = this.settings.get('feature')
  cb.onchange = () => this.settings.set('feature', cb.checked)
})
```

### `addText(build: (input: HTMLInputElement) => void)`

Add a single-line text input, placed in the controls area **after** the name. Equivalent to `addInput('text', ...)`.

```typescript
setting.addText(input => {
  input.value = this.settings.get('apiKey')
  input.onchange = () => this.settings.set('apiKey', input.value)
})
```

### `addInput(type: string, build: (input: HTMLInputElement) => void)`

Add an input of any type (e.g., `password`, `number`).

```typescript
setting.addInput('number', input => {
  input.value = this.settings.get('timeout').toString()
  input.onchange = () => this.settings.set('timeout', parseInt(input.value))
})
```

### `addTextArea(build: (input: HTMLTextAreaElement) => void)`

Add a multi-line textarea, placed in the info area.

```typescript
setting.addTextArea(textarea => {
  textarea.value = this.settings.get('template')
  textarea.onchange = () => this.settings.set('template', textarea.value)
})
```

### `addSelect(options: SelectOptions | ((select: HTMLSelectElement) => void))`

Add a dropdown select, supporting declarative options object or builder callback.

**Declarative:**

```typescript
setting.addSelect({
  options: ["light", "dark", "auto"],
  selected: this.settings.get('theme'),
  onchange: e => this.settings.set('theme', e.target.value)
})
```

**Builder (dynamic options):**

```typescript
setting.addSelect(select => {
  for (const folder of folders) {
    const opt = document.createElement('option')
    opt.value = folder.path
    opt.textContent = folder.name
    select.append(opt)
  }
})
```

### `addButton(build: (button: HTMLButtonElement) => void)`

Add a button, placed in the controls area **after** the name.

```typescript
setting.addButton(btn => {
  btn.textContent = "Save"
  btn.onclick = () => this.save()
})
```

### `addTag(text: string, build?: (el: HTMLElement) => void)`

Add a tag (`<div class="typ-tag">`), placed **before** the name.

```typescript
setting.addTag("Enabled")
```

### `addRemovableTag(text: string, onClose?: () => void)`

Add a closable tag with a close button.

```typescript
setting.addRemovableTag("tag1", () => {
  console.log("Removed tag1")
})
```

### `addTable(build: (table: EditableTable) => void)`

Add an editable table (`@beta`).

```typescript
setting.addTable(table => {
  table.setHeaders([
    { title: "Name", prop: "name" },
    { title: "Value", prop: "value" }
  ])
  table.setData(this.settings.get('items'))
  table.onRowChange(event => {
    this.settings.set('items', event.data)
  })
})
```

### `addSidebarLayout(options, onSelect)`

Add a sidebar + panel layout (`@beta`). The callback context contains:

- `items` — the full list of current sidebar items
- `item` — the currently selected item
- `panelEl` — the panel container element (free to manipulate DOM directly)
- `panel` — a panel object exposing `addSetting(build)`, the same method as `SettingTab.addSetting()`, to compose multiple setting rows into one panel

```typescript
const layout = setting.addSidebarLayout(
  { items: ["Option A", "Option B"], initialActive: "Option A" },
  ({ item, panel }) => {
    // Option 1: compose rows via panel.addSetting() (recommended)
    panel.addSetting(row => {
      row.addName("Selected")
      row.addDescription(`Current: ${item}`)
    })

    // Option 2: manipulate panelEl directly
    // panelEl.innerHTML = `<p>Selected: ${item}</p>`
  }
)

// Dynamically manage sidebar items
layout.addItem("Option C")
layout.removeItem("Option A")
layout.setItems(["New Option 1", "New Option 2"])
```


## Lifecycle

### `onshow()`

Called when the settings panel is displayed. Refresh/rebuild form content in this method.

```typescript
onshow() {
  this.render()
}
```

### `onhide()`

Called when the settings panel is hidden. Can be used for cleanup operations.

```typescript
onhide() {
  // Cleanup resources
}
```


## Complete Example

```typescript
class MyPluginSettingsTab extends PluginSettingTab {
  get name() {
    return "My Plugin"
  }

  render() {
    this.containerEl.empty()

    this.addSettingTitle("General")

    this.addSetting(setting => {
      setting.addName("Enable Feature")
      setting.addDescription("Turn on this feature")
      setting.addCheckbox(cb => {
        cb.checked = this.settings.get('enabled') ?? false
        cb.onchange = () => this.settings.set('enabled', cb.checked)
      })
    })

    this.addSetting(setting => {
      setting.addName("API Key")
      setting.addText(input => {
        input.value = this.settings.get('apiKey') ?? ''
        input.onchange = () => this.settings.set('apiKey', input.value)
      })
    })

    this.addSettingTitle("Advanced")

    this.addSetting(setting => {
      setting.addName("Theme")
      setting.addSelect({
        options: ["light", "dark", "auto"],
        selected: this.settings.get('theme') ?? 'auto',
        onchange: e => this.settings.set('theme', e.target.value)
      })
    })

    this.addSetting(setting => {
      setting.addName("Timeout (seconds)")
      setting.addInput('number', input => {
        input.value = (this.settings.get('timeout') ?? 30).toString()
        input.onchange = () => this.settings.set('timeout', parseInt(input.value))
      })
    })
  }

  onshow() {
    this.render()
  }
}
```
