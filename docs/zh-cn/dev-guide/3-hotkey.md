# 快捷键

注册快捷键以触发插件功能。



调用 Plugin 实现类的 `registerCommand()` 注册快捷键：

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

注册的快捷键会在插件卸载时自动移除。