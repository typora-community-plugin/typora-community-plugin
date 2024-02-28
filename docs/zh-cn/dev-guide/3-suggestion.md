# 自动完成

使用指定标点符号触发自动完成列表。



## 使用

使用 `register()` 注册，在 `Suggestion` 添加注册自定义 `Suggest` 实例：

```ts
// typora-plugin-note-snippets /src/main.ts

this.register(
  this.app.workspace.activeEditor.suggestion.register(
    this.suggest
  ))
```

自定义 `Suggest` 继承自 `EditorSuggest`（或其子类 `TextSuggest`）。



## 例子

- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets) 使用 `/` 触发
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag) 使用 `#` 触发
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink) 使用 `[[` 触发