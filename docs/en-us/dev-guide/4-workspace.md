# Workspace and Custom Views

Typora's native tabs are only used for Markdown files. In v2.10, core introduced an Obsidian-like workspace model that lets plugins register custom views and place them in the main split, the right sidebar, or floating windows.



## Workspace

Accessed via `app.workspace`:

| Member | Description |
| --- | --- |
| `rootSplit` | Root node of the main layout (split/tab tree). |
| `rightSplit` | Right sidebar; supports collapsing, expanding, and drag-resizing (`@since v2.10.0`). |
| `floatingSplit` | Floating window container (`@since v2.10.1`). |
| `ribbon` | The Ribbon (activity bar). Usually used through the [sidebar](./3-sidebar.md). |
| `sidebar` | The sidebar. |
| `activeLeaf` | Currently active tab; readable and writable. |
| `activeEditor` | Markdown editor instance. |
| `activeFile` | Path of the currently open file. |
| `createLeaf(state?)` | Create a tab node (not yet attached to the layout). |
| `getViewByType(ViewClass)` | Find a loaded view instance by view class. |
| `iterateViews(view, callback)` | Iterate the view tree; stop when the callback returns `true`. |
| `eachLeaves(callback)` | Iterate all tabs in the main layout, floating layer, and right sidebar. |
| `findLeaf(iteratee)` / `filterLeaves(iteratee)` | Find / filter tabs. |

For workspace events, see [Events](./3-events.md#workspace).



## Registering a Custom View

A view extends `WorkspaceView`:

```ts
import { Plugin, WorkspaceView } from '@typora-community-plugin/core'
import type { WorkspaceLeaf } from '@typora-community-plugin/core'

class MyView extends WorkspaceView {
  icon = 'fa fa-puzzle-piece'

  constructor(leaf: WorkspaceLeaf) {
    super(leaf)
    this.containerEl = document.createElement('div')
    this.containerEl.className = 'my-custom-view'
  }

  onOpen() {
    this.containerEl.textContent = this.leaf.state.path ?? ''
  }

  onClose() {
    // optional: clean up events and DOM inside the view
  }
}

export default class MyPlugin extends Plugin {
  onload() {
    this.register(
      this.app.viewManager.registerView('my-plugin:view', leaf => new MyView(leaf)))

    this.register(
      this.app.viewManager.registerExtension('myext', 'my-plugin:view'))
  }
}
```

After registration, opening a `.myext` file automatically creates this view.

> `containerEl` must be created and assigned by the subclass; core inserts it into the tab content area when the leaf is created.



## WorkspaceView

```ts
abstract class WorkspaceView extends Component {
  containerEl!: HTMLElement
  icon: string                         // defaults to 'fa-file-text-o'
  leaf: WorkspaceLeaf

  constructor(leaf: WorkspaceLeaf)

  setIcon(icon: string): void
  open(): void
  close(): void
  onOpen(): void
  onClose(): void
  getScroll(): { scrollTop: number }
  applyScroll(state: { scrollTop: number }): void
}
```

| Member | Description |
| --- | --- |
| `open()` | Show the view: calls `load()` (triggering `onload()`) and `onOpen()`. |
| `close()` | Close the view: calls `onClose()` and `unload()` (triggering `onunload()` and running disposables). |
| `setIcon(icon)` | Change the tab icon (Font Awesome class name). |
| `getScroll()` / `applyScroll()` | Read/restore scroll position; used when switching tabs. |

> When a view needs to persist its own state, read and write `leaf.state` (any object). The tab id uses `leaf.state.path`; custom views should use a unique `typ://` path.



## ViewManager

Accessed via `app.viewManager`:

| Method | Description |
| --- | --- |
| `registerView(type, factory)` | Register a view type and return an unregister function. The factory signature is `(leaf, state?) => WorkspaceView`. |
| `registerExtension(extension, type)` | Map a single extension to a view type. Duplicate extensions throw. |
| `registerExtensions(extensions, type)` | Map extensions in bulk. |
| `registerViewWithExtensions(extensions, type, factory)` | Register a view and its extensions at once. |
| `getTypeByPath(filePath)` | Get the view type by file path (supports multi-part extensions such as `a.b.md`). |
| `getTypeByExtension(extension)` | Get the view type by extension. |
| `getViewCreatorByType(type)` | Get the view factory. |

```ts
this.app.viewManager.registerViewWithExtensions(
  ['mmd', 'mermaid.md'],
  'my-plugin:diagram',
  leaf => new MyView(leaf))
```



## Opening and Layout

### Opening Files

```ts
this.app.openFile('/absolute/path/to/file.md')
this.app.openFile('relative/path.md')
this.app.openLink('https://typora.io')
```

When opening a file, the workspace checks whether a matching custom view exists via `getTypeByPath()`; if so it opens with that view, otherwise it hands the file to Typora's native editor or the system default application. Files without an extension are handed directly to the system default application.

### Creating Tabs

```ts
const leaf = this.app.workspace.createLeaf({
  type: 'my-plugin:view',
  state: { path: 'typ://my-plugin:view/instance-1' },
})

this.app.workspace.rootSplit.appendChild(leaf)
this.app.workspace.activeLeaf = leaf
```

### Splitting

Use built-in commands:

```ts
// split to the right
this.app.commands.run('core.workspace:split-right')

// split down
this.app.commands.run('core.workspace:split-down')
```

### Right Sidebar

```ts
// open a custom view in the right sidebar (argument is typ://<type>/<id>)
this.app.commands.run(
  'core.workspace.right-split:ensure-leaf',
  ['typ://my-plugin:view/instance-1'])

// collapse / expand / toggle
this.app.workspace.rightSplit.collapse()
this.app.workspace.rightSplit.expand()
this.app.workspace.rightSplit.toggle()

// set width (minimum 280px)
this.app.workspace.rightSplit.setSize(420)
```

### Floating Windows

```ts
this.app.commands.run(
  'core.workspace.floating-split:open-leaf',
  ['typ://my-plugin:view/instance-1'])
```

Floating views can be configured in `leaf.state`:

| Field | Description |
| --- | --- |
| `width` / `height` | Number (px) or CSS length. |
| `theme` | `'default'` or `'window'`. |
| `resizable` | Whether the window can be resized. |
| `draggable` | Whether the window can be dragged. |
| `onClose` | Callback when closing. |



## Layout Nodes

| Type | Description |
| --- | --- |
| `WorkspaceNode` | Base class of all layout nodes: `parent`, `containerEl`, `closest()`, `detach()`, `getRoot()`. |
| `WorkspaceParent` | Can contain child nodes: `appendChild()`, `insertChild()`, `replaceChild()`, `removeChild()`, `eachNodes()`, `findNode()`, `filterNodes()`, `eachLeaves()`. |
| `WorkspaceLeaf` | A tab: `state`, `viewType`, `view`, `setState()`. |
| `WorkspaceTabs` | A tab group: `activeLeaf`, `toggleTab()`, `renameTab()`, `removeTab()`, `removeOthers()`, `removeRight()`. |
| `WorkspaceSplit` | A split: `direction` is `'horizontal'` or `'vertical'`. |
| `WorkspaceSidedock` | Right sidebar: `size`, `collapsed`, `collapse()`, `expand()`, `toggle()`, `setSize()`. |

> Layout node types are only for type annotations; at runtime, get instances via `app.workspace`. Do not `new WorkspaceSplit()` yourself and mount it directly.
