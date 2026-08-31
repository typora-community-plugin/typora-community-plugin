# 设置界面

使用 Plugin 的 `registerSettingTab()` 注册继承自 `PluginSettingTab` 的类。

在子类中重写 `onshow()` 方法用于显示/刷新设置表单。

通过 `addSetting()` 方法为设置表单添加设置字段。


## 创建设置页

插件需要创建一个继承自 `PluginSettingTab` 的类，并重写 `name` getter：

```typescript
class MyPluginSettingsTab extends PluginSettingTab {
  get name() {
    return "我的插件"
  }

  onshow() {
    // 构建设置表单
  }
}
```

然后在 Plugin 中注册：

```typescript
export class MyPlugin extends Plugin {
  registerSettings() {
    this.registerSettingTab(new MyPluginSettingsTab(this.app, this))
  }
}
```


## SettingTab API

### `addSettingTitle(text: string)`

添加一个分组标题（`<h3>`）。

```typescript
this.addSettingTitle("常规设置")
```

### `addSetting(build: (setting: SettingItem) => void)`

核心方法，创建一个设置行并通过 builder 回调配置字段。

```typescript
this.addSetting(setting => {
  setting.addName("启用功能")
  setting.addDescription("开启这个功能")
  setting.addCheckbox(cb => {
    cb.checked = this.settings.get('enabled')
    cb.onclick = () => this.settings.set('enabled', cb.checked)
  })
})
```


## SettingItem API

每个 `addSetting()` 回调接收一个 `SettingItem` 实例，提供以下方法：

### `addName(name: string)`

添加设置名称（显示在信息区域）。

### `addBadge(text: string)`

在名称后添加一个徽章标签（`<code>`）。如果尚未调用 `addName()`，会自动创建一个空名称。

```typescript
setting.addName("版本")
setting.addBadge("v1.0.0")
// 或等价地：
setting.addBadge("v1.0.0") // 自动创建空名称
```

### `addDescription(description: string | ((div: HTMLElement) => void))`

添加描述文字，支持字符串或自定义 HTML builder。

```typescript
// 纯文本描述
setting.addDescription("这是一个说明")

// 自定义 HTML
setting.addDescription(div => {
  div.innerHTML = "<a href='https://example.com'>链接</a>"
})
```

### `addCheckbox(build: (checkbox: HTMLInputElement) => void)`

添加复选框，放置在名称**之前**的控制区域。

```typescript
setting.addCheckbox(cb => {
  cb.checked = this.settings.get('feature')
  cb.onchange = () => this.settings.set('feature', cb.checked)
})
```

### `addText(build: (input: HTMLInputElement) => void)`

添加单行文本输入框，放置在名称**之后**的控制区域。等价于 `addInput('text', ...)`。

```typescript
setting.addText(input => {
  input.value = this.settings.get('apiKey')
  input.onchange = () => this.settings.set('apiKey', input.value)
})
```

### `addInput(type: string, build: (input: HTMLInputElement) => void)`

添加任意类型的输入框（如 `password`、`number` 等）。

```typescript
setting.addInput('number', input => {
  input.value = this.settings.get('timeout').toString()
  input.onchange = () => this.settings.set('timeout', parseInt(input.value))
})
```

### `addTextArea(build: (input: HTMLTextAreaElement) => void)`

添加多行文本域，放置在信息区域。

```typescript
setting.addTextArea(textarea => {
  textarea.value = this.settings.get('template')
  textarea.onchange = () => this.settings.set('template', textarea.value)
})
```

### `addSelect(options: SelectOptions | ((select: HTMLSelectElement) => void))`

添加下拉选择框，支持声明式选项对象或 builder 回调。

**声明式：**

```typescript
setting.addSelect({
  options: ["light", "dark", "auto"],
  selected: this.settings.get('theme'),
  onchange: e => this.settings.set('theme', e.target.value)
})
```

**Builder（动态选项）：**

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

添加按钮，放置在名称**之后**的控制区域。

```typescript
setting.addButton(btn => {
  btn.textContent = "保存"
  btn.onclick = () => this.save()
})
```

### `addTag(text: string, build?: (el: HTMLElement) => void)`

添加一个标签（`<div class="typ-tag">`），放置在名称**之前**。

```typescript
setting.addTag("已启用")
```

### `addRemovableTag(text: string, onClose?: () => void)`

添加一个可关闭的标签，带有关闭按钮。

```typescript
setting.addRemovableTag("tag1", () => {
  console.log("移除 tag1")
})
```

### `addTable(build: (table: EditableTable) => void)`

添加一个可编辑表格（`@beta`）。

```typescript
setting.addTable(table => {
  table.setHeaders([
    { title: "名称", prop: "name" },
    { title: "值", prop: "value" }
  ])
  table.setData(this.settings.get('items'))
  table.onRowChange(event => {
    this.settings.set('items', event.data)
  })
})
```

### `addSidebarLayout(options, onSelect)`

添加一个侧边栏 + 面板布局（`@beta`）。

```typescript
const layout = setting.addSidebarLayout(
  { items: ["选项 A", "选项 B"], initialActive: "选项 A" },
  ({ item, panelEl }) => {
    panelEl.innerHTML = `<p>当前选中：${item}</p>`
  }
)

// 动态管理侧边栏项目
layout.addItem("选项 C")
layout.removeItem("选项 A")
layout.setItems(["新选项 1", "新选项 2"])
```


## 生命周期

### `onshow()`

当设置面板显示时调用。在此方法中刷新/重建表单内容。

```typescript
onshow() {
  this.render()
}
```

### `onhide()`

当设置面板隐藏时调用。可用于清理操作。

```typescript
onhide() {
  // 清理资源
}
```


## 完整示例

```typescript
class MyPluginSettingsTab extends PluginSettingTab {
  get name() {
    return "我的插件"
  }

  render() {
    this.containerEl.empty()

    this.addSettingTitle("常规")

    this.addSetting(setting => {
      setting.addName("启用功能")
      setting.addDescription("开启这个功能")
      setting.addCheckbox(cb => {
        cb.checked = this.settings.get('enabled') ?? false
        cb.onchange = () => this.settings.set('enabled', cb.checked)
      })
    })

    this.addSetting(setting => {
      setting.addName("API 密钥")
      setting.addText(input => {
        input.value = this.settings.get('apiKey') ?? ''
        input.onchange = () => this.settings.set('apiKey', input.value)
      })
    })

    this.addSettingTitle("高级")

    this.addSetting(setting => {
      setting.addName("主题")
      setting.addSelect({
        options: ["light", "dark", "auto"],
        selected: this.settings.get('theme') ?? 'auto',
        onchange: e => this.settings.set('theme', e.target.value)
      })
    })

    this.addSetting(setting => {
      setting.addName("超时（秒）")
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
