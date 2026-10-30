# Sidebar

Add an icon to the Ribbon (activity bar); clicking it shows a custom pane in the sidebar.



## Create a Pane

A pane extends `SidebarPanel` and implements `onshow()` / `onhide()`:

```ts
import { Plugin, SidebarPanel, html } from '@typora-community-plugin/core'

class TagPanel extends SidebarPanel {

  constructor(private plugin: MyPlugin) {
    super()

    this.addRibbonButton({
      id: 'my-plugin:tags',
      title: 'Tags',
      icon: html`<i class="fa fa-tags"></i>`,
      group: 'top',
    })
  }

  onshow() {
    this.containerEl.innerHTML = ''
    this.containerEl.append(html`<div class="tag-panel">Tag panel</div>`)
  }

  onhide() {
    // optional: clean up events inside the pane
  }
}
```

`addRibbonButton()` automatically sets `onclick` to "switch to the current pane", so you do not need to write click logic yourself.



## Register a Pane

Call `sidebar.addPanel()` in `onload()`:

```ts
export default class MyPlugin extends Plugin {
  onload() {
    this.register(this.app.workspace.sidebar.addPanel(new TagPanel(this)))
  }
}
```

`addPanel()` will:

1. add the pane to the sidebar management list;
2. if the pane has a `ribbonButton`, automatically add it to the Ribbon;
3. return an unregister function that removes the pane and its button.



## Sidebar

Accessed via `app.workspace.sidebar`:

| Member | Description |
| --- | --- |
| `addPanel(panel)` | Register a pane and return an unregister function. Recommended. |
| `removePanel(panel)` | Remove a pane and its Ribbon button. |
| `switch(PanelClass)` | Switch to the given pane; if it is already active, collapse the sidebar. |
| `toggle()` | Toggle sidebar visibility. |
| `show()` / `hide()` | Show/hide the sidebar. |
| `isShown` | Whether the sidebar is currently shown. |

```ts
this.app.workspace.sidebar.switch(TagPanel)
```

> `addChild()` / `removeChild()` are aliases kept for the old API; new code should use `addPanel()` / `removePanel()`.
>
> The `Sidebar` class exported from the package entry is marked as deprecated; get the instance via `app.workspace.sidebar` instead.



## SidebarPanel

| Member | Description |
| --- | --- |
| `containerEl` | Pane root element. |
| `ribbonButton` | Ribbon button configuration set via `addRibbonButton()`. |
| `onshow()` | Called when the pane is shown. |
| `onhide()` | Called when the pane is hidden. |
| `addRibbonButton(button)` | Set the Ribbon button; `onclick` is generated automatically. |

Ribbon button configuration:

```ts
type RibbonItemButton = {
  id: string          // unique id; duplicates throw
  title: string
  icon: HTMLElement
  group?: 'top' | 'bottom'
  className?: string
  onclick?: (event: MouseEvent) => void
  visible?: boolean   // defaults to true
  order?: number
}
```

> Pane visibility is managed by `Sidebar`: `show()` mounts `containerEl` into the sidebar and calls `onshow()`; `hide()` removes it from the DOM and calls `onhide()`.



## Operating the Ribbon Directly

If what you need to add is not a sidebar toggle (for example, opening settings or running a command), call `app.workspace.ribbon.addButton()` directly:

```ts
this.register(
  this.app.workspace.ribbon.addButton({
    id: 'my-plugin:action',
    title: 'Run action',
    icon: html`<i class="fa fa-bolt"></i>`,
    group: 'bottom',
    onclick: () => { /* ... */ },
  }))
```

A button's `visible` and ordering are persisted in core settings. Do not reuse an existing `id`, or an error is thrown.



## Examples

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
