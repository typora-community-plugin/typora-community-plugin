# Events

All event objects exposed by core extend `Events`. Bind with `on(event, listener)` and unbind with `off(event, listener)`. In plugins, it is recommended to wrap the return value of `on()` with `this.register(...)` so it is unbound automatically on unload.

```ts
this.register(
  this.app.vault.on('mounted', path => {
    console.log('vault mounted:', path)
  }))
```



## Typora Events

### App

| Event | Parameters | Description |
| --- | --- | --- |
| `load` | none | Fired after core and plugins have finished loading. This is a sticky event: subscribing after loading completes still delivers the notification immediately. |

```ts
this.app.on('load', () => { /* ... */ })
```



### Vault

Accessed via `app.vault`.

| Event | Parameters | Description |
| --- | --- | --- |
| `mounted` | `(path: string)` | Fired when the notes folder is mounted for the first time or when switching folders. |
| `change` | `(path: string)` | Fired when switching the notes folder. |
| `directory:rename` | `(oldPath: string, newPath: string)` | A folder was renamed. |
| `file:delete` | `(path: string)` | A file was deleted. |
| `file:rename` | `(oldPath: string, newPath: string)` | A file was renamed. |

`Vault` also provides the following properties:

| Property | Description |
| --- | --- |
| `id` | A stable id derived from the notes folder path. |
| `path` | Path of the current notes folder. |
| `configDir` | `<vault>/.typora`. |
| `dataDir` | `<vault>/.typora/data`. |



### Workspace

Accessed via `app.workspace`.

| Event | Parameters | Description |
| --- | --- | --- |
| `active-leaf:change` | `(leaf: WorkspaceLeaf)` | The active tab changed. |
| `file:will-open` | `(path: string)` | A file is about to be opened. |
| `file:open` | `(path: string)` | A file has been opened. |
| `file:will-save` | `(path: string)` | A file is about to be saved. |
| `file-menu` | `({ menu, path })` | File tree context menu. `menu` is used to append menu items; `path` is the file path. |
| `editor-menu` | `({ menu })` | Editor context menu. `menu` is used to append menu items. |

```ts
this.register(
  this.app.workspace.on('file:open', path => {
    console.log('opened:', path)
  }))
```



### MarkdownEditor

Accessed via `app.features.markdownEditor` (note the plural `features`).

| Event | Parameters | Description |
| --- | --- | --- |
| `load` | `(editorEl: HTMLElement)` | The editor DOM is ready. |
| `edit` | none | Document content changed (already debounced). |
| `scroll` | none | Editor scrolled (already debounced). |
| `contextmenu` | `({ menu })` | Editor context menu. |

Plugins can also use the wrapper method:

```ts
this.registerMarkdownEvent('edit', () => { /* ... */ })
```



## Events API

`App`, `Vault`, `Workspace`, and `MarkdownEditor` all provide the following methods:

| Method | Description |
| --- | --- |
| `on(event, listener)` | Bind an event and return an unbind function. |
| `once(event, listener)` | Trigger only once and return an unbind function. |
| `prependListener(event, listener)` | Bind to the front of the listener list and return an unbind function. |
| `off(event, listener)` | Unbind the specified listener. |
| `getEventNames()` | Return the names of events that have had listeners registered. |

```ts
const dispose = this.app.workspace.on('file:open', onOpen)
// equivalent to this.register(dispose)
dispose()
```



## DOM Events

Use `registerDomEvent(el, eventName, listener, options?)` in the plugin implementation class to register DOM events; they are unbound automatically on unload:

```ts
this.registerDomEvent(window, 'resize', () => { /* ... */ })

this.registerDomEvent(document, 'keydown', event => {
  // ...
}, { capture: true })
```



## Timers

`registerInterval(intervalId)` automatically calls `clearInterval` on unload:

```ts
const id = setInterval(() => { /* ... */ }, 1000)
this.registerInterval(id)
```

> There is no wrapper for `setTimeout`; when needed, use `this.register(() => clearTimeout(id))`.
