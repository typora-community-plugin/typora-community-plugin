# Command

The command palette can be opened by default using the shortcut <kbd>F1</kbd>.



## Register Command

Use `registerCommand()` in the `onload()` method of the plugin implementation class to register commands:

```js
// typora-plugin-collapsible-section /src/main.ts

export default class extends Plugin {
  onload() {
    
    this.registerCommand({
      id: 'fold-all',
      title: this.i18n.t.foldAll,
      scope: 'editor',
      callback: () => foldAll('', true),
    })
    
    // ...
  }
}
```

Registered commands will be automatically removed when the plugin is unloaded.
