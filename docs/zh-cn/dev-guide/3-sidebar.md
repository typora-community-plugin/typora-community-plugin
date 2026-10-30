# 侧边栏

在活动栏（Ribbon）添加图标，点击后在侧边栏显示自定义面板。



## 创建面板

面板继承自 `SidebarPanel`，并实现 `onshow()` / `onhide()`：

```ts
import { Plugin, SidebarPanel, html } from '@typora-community-plugin/core'

class TagPanel extends SidebarPanel {

  constructor(private plugin: MyPlugin) {
    super()

    this.addRibbonButton({
      id: 'my-plugin:tags',
      title: '标签',
      icon: html`<i class="fa fa-tags"></i>`,
      group: 'top',
    })
  }

  onshow() {
    this.containerEl.innerHTML = ''
    this.containerEl.append(html`<div class="tag-panel">标签面板</div>`)
  }

  onhide() {
    // 可选：清理面板内的事件
  }
}
```

`addRibbonButton()` 会自动把 `onclick` 设置为「切换到当前面板」，无需手写点击逻辑。



## 注册面板

在 `onload()` 中调用 `sidebar.addPanel()`：

```ts
export default class MyPlugin extends Plugin {
  onload() {
    this.register(this.app.workspace.sidebar.addPanel(new TagPanel(this)))
  }
}
```

`addPanel()` 会：

1. 把面板加入侧边栏管理列表；
2. 如果面板设置了 `ribbonButton`，自动把它添加到活动栏；
3. 返回一个注销函数，可用于移除面板与对应按钮。



## Sidebar

通过 `app.workspace.sidebar` 访问：

| 成员 | 说明 |
| --- | --- |
| `addPanel(panel)` | 注册面板，返回注销函数。推荐使用。 |
| `removePanel(panel)` | 移除面板及其活动栏按钮。 |
| `switch(PanelClass)` | 切换到指定面板；如果已经是当前面板，则收起侧边栏。 |
| `toggle()` | 切换侧边栏显示/隐藏。 |
| `show()` / `hide()` | 显示/隐藏侧边栏。 |
| `isShown` | 当前侧边栏是否显示。 |

```ts
this.app.workspace.sidebar.switch(TagPanel)
```

> `addChild()` / `removeChild()` 是兼容旧版 API 的别名，新代码请使用 `addPanel()` / `removePanel()`。
>
> 包入口导出的 `Sidebar` 类已标记为废弃，实际使用时请通过 `app.workspace.sidebar` 获取实例。



## SidebarPanel

| 成员 | 说明 |
| --- | --- |
| `containerEl` | 面板根元素。 |
| `ribbonButton` | 通过 `addRibbonButton()` 设置的活动栏按钮配置。 |
| `onshow()` | 面板显示时调用。 |
| `onhide()` | 面板隐藏时调用。 |
| `addRibbonButton(button)` | 设置活动栏按钮，`onclick` 自动生成。 |

活动栏按钮配置：

```ts
type RibbonItemButton = {
  id: string          // 唯一 id，重复会抛错
  title: string
  icon: HTMLElement
  group?: 'top' | 'bottom'
  className?: string
  onclick?: (event: MouseEvent) => void
  visible?: boolean   // 默认 true
  order?: number
}
```

> 面板的显示/隐藏由 `Sidebar` 管理：`show()` 会把 `containerEl` 挂到侧边栏并调用 `onshow()`；`hide()` 会移出 DOM 并调用 `onhide()`。



## 直接操作活动栏

如果需要添加的不是侧边栏开关（例如打开设置、执行命令），可以直接调用 `app.workspace.ribbon.addButton()`：

```ts
this.register(
  this.app.workspace.ribbon.addButton({
    id: 'my-plugin:action',
    title: '执行操作',
    icon: html`<i class="fa fa-bolt"></i>`,
    group: 'bottom',
    onclick: () => { /* ... */ },
  }))
```

按钮的 `visible` 与排序会持久化到 core 设置中。不要复用已存在的 `id`，否则会抛错。



## 例子

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
