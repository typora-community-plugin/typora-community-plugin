# 事件

## Typora 事件

模块 [`@typora-community-plugin/core`](https://www.npmjs.com/package/@typora-community-plugin/core) 提供了一些 Typora 相关的事件（具体可以参考对应的类型定义）：

| 类               | 变量                         | 事件                                                         |
| ---------------- | ---------------------------- | ------------------------------------------------------------ |
| `App`            | `app`                        | 加载时                                                       |
| `Vault`          | `app.vault`                  | 笔记文件夹打开时、笔记文件夹切换时、文件夹重命名、文件删除、文件重命名 |
| `Workspace`      | `app.workspace`              | 文件打开前、文件打开后、文件保存前                           |
| `MarkdownEditor` | `app.feature.markdownEditor` | 加载完成、编辑、滚动                                         |

可以通过 Events 相关的接口绑定（使用 `on()` 方法）和解绑（使用 `off()` 方法）。



事件绑定可以使用 `register()` 注册，这样在插件卸载时就能自动解绑。

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



## DOM 事件

在插件实现类的 `onload()` 方法中使用 `registerDomEvent(el, eventName, listener)` 方法注册 DOM 事件，在插件卸载时能自动解绑。
