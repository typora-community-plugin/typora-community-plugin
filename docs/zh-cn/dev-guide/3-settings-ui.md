# 设置界面

使用 `registerSettingTab()` 注册继承自 `SettingTab` 的设置页。

在子类中重写 `onshow()` 方法构建/刷新设置表单，通过 `addSetting()` 添加设置行。



## 创建设置页

`SettingTab` 的构造函数没有参数，也不持有 `app` / `plugin` / `settings`。推荐通过自定义构造函数把插件实例传进去：

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
    this.addSettingTitle('常规')

    this.addSetting(setting => {
      setting.addName('启用功能')
      setting.addDescription('开启这个功能')
    })
  }
}
```

然后在 `onload()` 中注册：

```ts
import { Plugin, PluginSettings } from '@typora-community-plugin/core'

export default class MyPlugin extends Plugin {
  onload() {
    this.registerSettings(new PluginSettings(this.app, this.manifest, { version: 1 }))
    this.registerSettingTab(new MySettingsTab(this))
  }
}
```

注册后设置页会显示在设置弹窗的「插件」分组中。



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

| 成员 | 说明 |
| --- | --- |
| `name` | 设置页在侧边栏显示的名称，必须实现。 |
| `pill` | 显示在名称旁的小徽标，可选。 |
| `containerEl` | 设置页根元素（`.typ-setting-tab`）。刷新时用 `innerHTML = ''` 清空。 |
| `addSettingTitle(text)` | 添加分组标题（`<h3>`）。 |
| `addSetting(build)` | 创建一行设置，并交给 `build` 配置。 |
| `onshow()` | 设置页显示时调用，在这里构建或刷新表单。 |
| `onhide()` | 设置页隐藏时调用，可用于清理。 |

> 注册设置页时，core 仍会调用兼容旧版 API 的 `onload()`；新代码应使用 `onshow()` / `onhide()` 构建与清理界面。



## SettingItem

每个 `addSetting()` 回调接收一个 `SettingItem`：

| 方法 | 说明 |
| --- | --- |
| `addTitle(text \| build)` | 在信息区添加标题。通常用 `SettingTab.addSettingTitle()`。 |
| `addName(text \| build)` | 添加设置名称。 |
| `addBadge(text \| build)` | 在名称后追加 `<code>` 徽标；未调用 `addName()` 时会自动创建空名称。 |
| `addDescription(text \| build)` | 添加描述文字，支持字符串或自定义 HTML。 |
| `addCheckbox(build)` | 添加复选框，位于名称前的控制区。 |
| `addCheckbox({ settings, bindingKey })` | 绑定式复选框：自动读取并写回指定配置键。 |
| `addButton(build)` | 在名称后的控制区添加按钮。 |
| `addInput(type, build)` | 添加指定类型的输入框。 |
| `addText(build)` | 等价于 `addInput('text', build)`。 |
| `addTextArea(build)` | 在信息区添加多行文本域。 |
| `addSelect(options \| build)` | 添加下拉框（`@beta`）。 |
| `addTag(text, build?)` | 添加标签，位于名称后的控制区最前面。 |
| `addRemovableTag(text, onClose?)` | 添加带关闭按钮的标签。 |
| `addTable(build)` | 添加可编辑表格（`@beta`）。 |
| `addSidebarLayout(options, onSelect)` | 添加「侧边栏 + 面板」布局（`@beta`）。 |



### 输入控件

```ts
this.addSetting(setting => {
  setting.addName('API 密钥')
  setting.addText(input => {
    input.type = 'password'
    input.value = this.plugin.settings.get('apiKey') ?? ''
    input.onchange = () => this.plugin.settings.set('apiKey', input.value)
  })
})

this.addSetting(setting => {
  setting.addName('超时（秒）')
  setting.addInput('number', input => {
    input.value = String(this.plugin.settings.get('timeout') ?? 30)
    input.onchange = () => this.plugin.settings.set('timeout', Number(input.value))
  })
})
```



### 绑定式复选框

最常见的开关配置可以直接绑定：

```ts
this.addSetting(setting => {
  setting.addName('启用功能')
  setting.addDescription('关闭后不再处理文档')
  setting.addCheckbox({
    settings: this.plugin.settings,
    bindingKey: 'enabled',
  })
})
```

等价于手动读写：

```ts
setting.addCheckbox(cb => {
  cb.checked = this.plugin.settings.get('enabled') ?? false
  cb.onchange = () => this.plugin.settings.set('enabled', cb.checked)
})
```



### 下拉框

> **@beta**

声明式写法只支持字符串选项，`selected` 必填：

```ts
setting.addSelect({
  options: ['light', 'dark', 'auto'],
  selected: this.plugin.settings.get('theme') ?? 'auto',
  onchange: event => this.plugin.settings.set('theme', event.target.value),
})
```

需要动态选项或自定义值/文本时使用 builder：

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



### 可编辑表格

> **@beta**

只有设置了 `type` 的列才会在编辑行中渲染输入框：

```ts
setting.addTable(table => {
  table.setHeaders([
    { title: '名称', prop: 'name', type: 'text' },
    { title: '值', prop: 'value', type: 'text' },
  ])
  table.setData(this.plugin.settings.get('items') ?? [])

  table.onRowChange(row => {
    // row 是当前行的对象，不是 { data }
    console.log('changed row:', row)
  })
  table.onRowRemove(row => {
    console.log('removed row:', row)
  })
})
```

`EditableTable` 还提供 `getData()`、`setData()`、`setHeaders()`、`onRowChange()`、`onRowRemove()`。表格数据不会自动持久化，需要在回调中写入设置。



### 侧边栏布局

> **@beta**

`addSidebarLayout()` 返回的对象可以动态增删左侧项目：

```ts
const layout = setting.addSidebarLayout(
  { items: ['常规', '高级'], initialActive: '常规' },
  ({ item, panelEl, panel }) => {
    if (item === '常规') {
      panel.addSetting(row => {
        row.addName('启用')
        row.addCheckbox({
          settings: this.plugin.settings,
          bindingKey: 'enabled',
        })
      })
      return
    }

    // 也可以直接操作 panelEl
    panelEl.innerHTML = '<p>高级选项</p>'
  })

layout.addItem('实验性')
layout.removeItem('常规')
layout.setItems(['A', 'B'])
```



## 完整示例

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
    this.addSettingTitle('常规')

    this.addSetting(setting => {
      setting.addName('启用功能')
      setting.addDescription('开启这个功能')
      setting.addCheckbox({
        settings: this.plugin.settings,
        bindingKey: 'enabled',
      })
    })

    this.addSetting(setting => {
      setting.addName('API 密钥')
      setting.addText(input => {
        input.type = 'password'
        input.value = this.plugin.settings.get('apiKey') ?? ''
        input.onchange = () => this.plugin.settings.set('apiKey', input.value)
      })
    })

    this.addSettingTitle('高级')

    this.addSetting(setting => {
      setting.addName('主题')
      setting.addSelect({
        options: ['light', 'dark', 'auto'],
        selected: this.plugin.settings.get('theme') ?? 'auto',
        onchange: event => this.plugin.settings.set('theme', event.target.value),
      })
    })

    this.addSetting(setting => {
      setting.addName('超时（秒）')
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



## 例子

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets)
