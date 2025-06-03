# Shortcuts

Register shortcuts to trigger plugin functions.

Call the Plugin implementation class's `registerCommand()` to register shortcuts:

```js
// typora-plugin-tag /src/features/style-toggler.ts

this.plugin.registerCommand({
  id: 'toggle-style',
  title: this.plugin.i18n.t.toggleTag,
  scope: 'editor',
  hotkey: 'Alt+Ctrl+T',
  callback: () => this.toggleTagStyle(),
})
```

The registered shortcuts will be automatically removed when the plugin is uninstalled.
