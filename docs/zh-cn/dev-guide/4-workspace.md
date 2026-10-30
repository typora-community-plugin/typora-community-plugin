# 工作区与自定义视图

Typora 原生的标签页只用于 Markdown 文件。core 在 v2.10 中提供了类似 Obsidian 的工作区模型，允许插件注册自定义视图，并把它们放进主分栏、右侧栏或浮动窗口。



## Workspace

通过 `app.workspace` 访问：

| 成员 | 说明 |
| --- | --- |
| `rootSplit` | 主布局根节点（分栏 / 标签页树）。 |
| `rightSplit` | 右侧栏，支持折叠、展开、拖拽调整宽度（`@since v2.10.0`）。 |
| `floatingSplit` | 浮动窗口容器（`@since v2.10.1`）。 |
| `ribbon` | 活动栏。通常通过[侧边栏](./3-sidebar.md)使用。 |
| `sidebar` | 侧边栏。 |
| `activeLeaf` | 当前活动标签页，可读写。 |
| `activeEditor` | Markdown 编辑器实例。 |
| `activeFile` | 当前打开文件的路径。 |
| `createLeaf(state?)` | 创建一个标签页节点（尚未挂到布局）。 |
| `getViewByType(ViewClass)` | 按视图类查找已加载的视图实例。 |
| `iterateViews(view, callback)` | 遍历视图树，回调返回 `true` 停止。 |
| `eachLeaves(callback)` | 遍历主布局、浮动层、右侧栏中的所有标签页。 |
| `findLeaf(iteratee)` / `filterLeaves(iteratee)` | 查找 / 过滤标签页。 |

工作区事件见[事件](./3-events.md#workspace)。



## 注册自定义视图

视图继承 `WorkspaceView`：

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
    // 可选：清理视图内的事件与 DOM
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

注册后，打开 `.myext` 文件会自动创建该视图。

> `containerEl` 必须由子类创建并赋值；创建 leaf 时 core 会把它插入标签页内容区。



## WorkspaceView

```ts
abstract class WorkspaceView extends Component {
  containerEl!: HTMLElement
  icon: string                         // 默认 'fa-file-text-o'
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

| 成员 | 说明 |
| --- | --- |
| `open()` | 显示视图：调用 `load()`（触发 `onload()`）与 `onOpen()`。 |
| `close()` | 关闭视图：调用 `onClose()` 与 `unload()`（触发 `onunload()` 并执行 disposables）。 |
| `setIcon(icon)` | 修改标签页图标（Font Awesome 类名）。 |
| `getScroll()` / `applyScroll()` | 读取/恢复滚动位置，切换标签页时会用到。 |

> 视图需要持久化自己的状态时，可读写 `leaf.state`（任意对象）。标签页 id 使用 `leaf.state.path`，自定义视图建议使用唯一的 `typ://` 路径。



## ViewManager

通过 `app.viewManager` 访问：

| 方法 | 说明 |
| --- | --- |
| `registerView(type, factory)` | 注册视图类型，返回注销函数。工厂签名为 `(leaf, state?) => WorkspaceView`。 |
| `registerExtension(extension, type)` | 把单个扩展名映射到视图类型。扩展名重复会抛错。 |
| `registerExtensions(extensions, type)` | 批量映射扩展名。 |
| `registerViewWithExtensions(extensions, type, factory)` | 同时注册视图与扩展名。 |
| `getTypeByPath(filePath)` | 根据文件路径（支持多段扩展名，如 `a.b.md`）获取视图类型。 |
| `getTypeByExtension(extension)` | 根据扩展名获取视图类型。 |
| `getViewCreatorByType(type)` | 获取视图工厂。 |

```ts
this.app.viewManager.registerViewWithExtensions(
  ['mmd', 'mermaid.md'],
  'my-plugin:diagram',
  leaf => new MyView(leaf))
```



## 打开与布局

### 打开文件

```ts
this.app.openFile('/absolute/path/to/file.md')
this.app.openFile('relative/path.md')
this.app.openLink('https://typora.io')
```

打开文件时，工作区会通过 `getTypeByPath()` 检查是否有匹配的自定义视图；有则用对应视图打开，否则交给 Typora 原生编辑器或系统默认程序。没有扩展名的文件会直接交给系统默认程序。

### 创建标签页

```ts
const leaf = this.app.workspace.createLeaf({
  type: 'my-plugin:view',
  state: { path: 'typ://my-plugin:view/instance-1' },
})

this.app.workspace.rootSplit.appendChild(leaf)
this.app.workspace.activeLeaf = leaf
```

### 分栏

使用内置命令：

```ts
// 向右分栏
this.app.commands.run('core.workspace:split-right')

// 向下分栏
this.app.commands.run('core.workspace:split-down')
```

### 右侧栏

```ts
// 打开一个自定义视图到右侧栏（参数为 typ://<type>/<id>）
this.app.commands.run(
  'core.workspace.right-split:ensure-leaf',
  ['typ://my-plugin:view/instance-1'])

// 折叠 / 展开 / 切换
this.app.workspace.rightSplit.collapse()
this.app.workspace.rightSplit.expand()
this.app.workspace.rightSplit.toggle()

// 设置宽度（最小 280px）
this.app.workspace.rightSplit.setSize(420)
```

### 浮动窗口

```ts
this.app.commands.run(
  'core.workspace.floating-split:open-leaf',
  ['typ://my-plugin:view/instance-1'])
```

浮动视图可以在 `leaf.state` 中配置：

| 字段 | 说明 |
| --- | --- |
| `width` / `height` | 数字（px）或 CSS 长度。 |
| `theme` | `'default'` 或 `'window'`。 |
| `resizable` | 是否可调整大小。 |
| `draggable` | 是否可拖拽。 |
| `onClose` | 关闭时的回调。 |



## 布局节点

| 类型 | 说明 |
| --- | --- |
| `WorkspaceNode` | 所有布局节点的基类：`parent`、`containerEl`、`closest()`、`detach()`、`getRoot()`。 |
| `WorkspaceParent` | 可包含子节点：`appendChild()`、`insertChild()`、`replaceChild()`、`removeChild()`、`eachNodes()`、`findNode()`、`filterNodes()`、`eachLeaves()`。 |
| `WorkspaceLeaf` | 标签页：`state`、`viewType`、`view`、`setState()`。 |
| `WorkspaceTabs` | 标签页组：`activeLeaf`、`toggleTab()`、`renameTab()`、`removeTab()`、`removeOthers()`、`removeRight()`。 |
| `WorkspaceSplit` | 分栏：`direction` 为 `'horizontal'` 或 `'vertical'`。 |
| `WorkspaceSidedock` | 右侧栏：`size`、`collapsed`、`collapse()`、`expand()`、`toggle()`、`setSize()`。 |

> 布局节点类型仅用于类型标注；运行时请通过 `app.workspace` 获取实例，不要自行 `new WorkspaceSplit()` 后直接挂载。
