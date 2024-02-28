# 侧边栏

按下活动栏图标，可在在侧边栏显示指定面板。



## 使用

使用 `register()` 注册，在 `WorkspaceRibbon` 添加按钮，按钮的点击事件切换侧栏面板

```ts
// typora-plugin-tag /src/features/use-sugguest.ts

this.register(
  this.app.workspace.getViewByType(WorkspaceRibbon)!.addButton({
    // ...
    onclick: () => sidebar.switch(TagPanel),
  })
)
```

使用 `register()` 注册，在侧栏注册面板实例。

```ts
// typora-plugin-tag /src/features/use-sugguest.ts

this.register(
  sidebar.addChild(new TagPanel(plugin, this)))
```

其中 TagPanel 继承自 View，实现 `show()` 方法渲染面板。



## 例子

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)

