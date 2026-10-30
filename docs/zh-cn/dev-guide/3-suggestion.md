# 自动完成

使用指定标点符号触发自动完成列表。



## 注册

实现 `EditorSuggest`（或它的子类 `TextSuggest`），然后在 `onload()` 中注册：

```ts
this.registerMarkdownSuggest(new TagSuggest())
```

注册后会在插件卸载时自动移除。

> 该方法的旧拼写为 `registerMarkdownSugguest()`（三个 `g`）。旧拼写仍作为兼容别名保留，但新代码请使用 `registerMarkdownSuggest()`。
>
> 也可以直接调用 `app.features.markdownEditor.suggestion.register(suggest)`，它返回注销函数。



## TextSuggest

纯文本建议继承 `TextSuggest` 最省事，只需提供触发前缀、候选列表、查询解析与插入文本：

```ts
import { TextSuggest } from '@typora-community-plugin/core'

class TagSuggest extends TextSuggest {
  triggerText = '#'
  suggestions = ['todo', 'idea', 'question']

  findQuery(textBefore: string) {
    const match = textBefore.match(/#([^\s#]*)$/)
    return match
      ? { isMatched: true, query: match[1] }
      : { isMatched: false }
  }

  beforeApply(suggest: string) {
    return `#${suggest} `
  }
}
```

| 成员 | 说明 |
| --- | --- |
| `triggerText` | 触发前缀。 |
| `suggestions` | 全部候选文本。 |
| `findQuery(textBefore, textAfter, range)` | 从光标前文本中提取查询词。 |
| `beforeApply(suggest)` | 返回选中项要插入的 Markdown 文本。 |

`TextSuggest` 已实现 `getSuggestions()`（按包含关系过滤并排序）、`getSuggestionId()`、`getSuggestionById()`。



## EditorSuggest

需要渲染富文本候选或自定义候选对象时，继承 `EditorSuggest<T>`：

```ts
abstract class EditorSuggest<T> {
  abstract triggerText: string

  canTrigger(textBefore: string, textAfter: string, range: TRange): boolean
  abstract findQuery(textBefore: string, textAfter: string, range: TRange):
    { isMatched: boolean, query?: string }

  abstract getSuggestions(query: string): NonNullable<T>[]
  abstract getSuggestionId(suggest: NonNullable<T>): string
  abstract getSuggestionById(id: string): NonNullable<T>

  /** 返回 HTML 字符串 */
  renderSuggestion(suggest: NonNullable<T>): string
  /** 返回要插入的 Markdown */
  abstract beforeApply(suggest: NonNullable<T>): string

  lengthOfTextBeforeToBeReplaced(query: string): number
}
```

| 成员 | 说明 |
| --- | --- |
| `canTrigger()` | 是否处理本次输入。默认只要光标前有文本就返回 `true`。 |
| `findQuery()` | 判断是否匹配触发条件，并提取查询词。 |
| `getSuggestions()` | 根据查询词返回候选列表。 |
| `getSuggestionId()` | 候选对象的唯一 id，用于点击选择时反查。 |
| `getSuggestionById()` | 根据 id 取回候选对象。 |
| `renderSuggestion()` | 返回候选的 HTML 字符串。 |
| `beforeApply()` | 返回最终插入编辑器的 Markdown。 |
| `lengthOfTextBeforeToBeReplaced()` | 应用候选时需要替换的光标前文本长度，默认 `query.length + triggerText.length`。 |

执行流程：

```
canTrigger → findQuery → show → getSuggestions → renderSuggestion
→ 用户选择 → lengthOfTextBeforeToBeReplaced → getSuggestionById → beforeApply
```



## 例子

- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets) 使用 `/` 触发
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag) 使用 `#` 触发
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink) 使用 `[[` 触发
