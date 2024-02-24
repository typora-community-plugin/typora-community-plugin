# 命令

默认使用快捷键 <kbd>F1</kbd> 可以打开命令面板。



## 注册命令

在插件实现类的 `onload()` 方法中使用 `registerCommand()` 注册命令：

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

注册的命令会在插件卸载时自动移除。