# 事件

core 暴露的事件对象都继承自 `Events`，使用 `on(event, listener)` 绑定、`off(event, listener)` 解绑。插件中推荐使用 `this.register(...)` 包裹 `on()` 的返回值，卸载时会自动解绑。

```ts
this.register(
  this.app.vault.on('mounted', path => {
    console.log('vault mounted:', path)
  }))
```



## Typora 事件

### App

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `load` | 无 | core 与插件加载完成后触发。这是 sticky 事件，加载完成后再订阅也会立即收到一次通知。 |

```ts
this.app.on('load', () => { /* ... */ })
```



### Vault

通过 `app.vault` 访问。

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `mounted` | `(path: string)` | 首次挂载笔记文件夹，或切换文件夹时触发。 |
| `change` | `(path: string)` | 切换笔记文件夹时触发。 |
| `directory:rename` | `(oldPath: string, newPath: string)` | 文件夹重命名。 |
| `file:delete` | `(path: string)` | 文件被删除。 |
| `file:rename` | `(oldPath: string, newPath: string)` | 文件重命名。 |

`Vault` 还提供以下属性：

| 属性 | 说明 |
| --- | --- |
| `id` | 由笔记文件夹路径计算出的稳定 id。 |
| `path` | 当前笔记文件夹路径。 |
| `configDir` | `<vault>/.typora`。 |
| `dataDir` | `<vault>/.typora/data`。 |



### Workspace

通过 `app.workspace` 访问。

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `active-leaf:change` | `(leaf: WorkspaceLeaf)` | 活动标签页变化。 |
| `file:will-open` | `(path: string)` | 文件即将打开。 |
| `file:open` | `(path: string)` | 文件已打开。 |
| `file:will-save` | `(path: string)` | 文件即将保存。 |
| `file-menu` | `({ menu, path })` | 文件树右键菜单。`menu` 用于追加菜单项，`path` 为文件路径。 |
| `editor-menu` | `({ menu })` | 编辑器右键菜单。`menu` 用于追加菜单项。 |

```ts
this.register(
  this.app.workspace.on('file:open', path => {
    console.log('opened:', path)
  }))
```



### MarkdownEditor

通过 `app.features.markdownEditor` 访问（注意是 `features`，复数）。

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `load` | `(editorEl: HTMLElement)` | 编辑器 DOM 就绪。 |
| `edit` | 无 | 文档内容变化（已做防抖）。 |
| `scroll` | 无 | 编辑器滚动（已做防抖）。 |
| `contextmenu` | `({ menu })` | 编辑器右键菜单。 |

插件中也可以使用封装方法：

```ts
this.registerMarkdownEvent('edit', () => { /* ... */ })
```



## Events API

`App`、`Vault`、`Workspace`、`MarkdownEditor` 都提供以下方法：

| 方法 | 说明 |
| --- | --- |
| `on(event, listener)` | 绑定事件，返回解绑函数。 |
| `once(event, listener)` | 只触发一次，返回解绑函数。 |
| `prependListener(event, listener)` | 绑定到监听器列表最前面，返回解绑函数。 |
| `off(event, listener)` | 解绑指定监听器。 |
| `getEventNames()` | 返回已注册过监听器的事件名。 |

```ts
const dispose = this.app.workspace.on('file:open', onOpen)
// 等价于 this.register(dispose)
dispose()
```



## DOM 事件

在插件实现类中使用 `registerDomEvent(el, eventName, listener, options?)` 注册 DOM 事件，卸载时自动解绑：

```ts
this.registerDomEvent(window, 'resize', () => { /* ... */ })

this.registerDomEvent(document, 'keydown', event => {
  // ...
}, { capture: true })
```



## 定时器

`registerInterval(intervalId)` 会在卸载时自动 `clearInterval`：

```ts
const id = setInterval(() => { /* ... */ }, 1000)
this.registerInterval(id)
```

> `setTimeout` 没有对应的封装，需要时使用 `this.register(() => clearTimeout(id))`。
