# Events

## Typora Events

The module [`@typora-community-plugin/core`](https://www.npmjs.com/package/@typora-community-plugin/core) provides a number of Typora-related events (specific definitions can be referenced in the corresponding type definitions):

| Class             | Variable                      | Event                                                       |
| ----------------- | ----------------------------- | ----------------------------------------------------------- |
| `App`             | `app`                         | On load                                                    |
| `Vault`           | `app.vault`                   | When the notes folder is opened, when switching notes folders, renaming folders, deleting files, renaming files |
| `Workspace`       | `app.workspace`               | Before file opens, after file opens, before file saves      |
| `MarkdownEditor`  | `app.feature.markdownEditor`  | On load completion, editing, scrolling                      |

Events can be bound (using the `on()` method) and unbound (using the `off()` method) through the Events-related interfaces.

Event binding can use `register()` for registration, so it can automatically unbind when the plugin is unloaded.

```js
// typora-plugin-note-snippets /src/main.ts

export default class extends Plugin {
  onload() {
    
    this.register(
      this.app.vault.on('mounted', () =>
        this.suggest._loadCodeSnippets()))
    
    // ...
  }
}
```

## DOM Events

In the `onload()` method of the plugin implementation class, the `registerDomEvent(el, eventName, listener)` method is used to register DOM events, which can automatically unbind when the plugin is unloaded.
