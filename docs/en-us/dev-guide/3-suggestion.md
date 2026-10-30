# Suggestion

Trigger a suggestion list with a given punctuation character.



## Registration

Implement `EditorSuggest` (or its subclass `TextSuggest`) and register it in `onload()`:

```ts
this.registerMarkdownSuggest(new TagSuggest())
```

It is removed automatically when the plugin is unloaded.

> The old spelling of this method is `registerMarkdownSugguest()` (three `g`s). It is still kept as a compatibility alias, but new code should use `registerMarkdownSuggest()`.
>
> You can also call `app.features.markdownEditor.suggestion.register(suggest)` directly, which returns an unregister function.



## TextSuggest

Extending `TextSuggest` is the easiest way to suggest plain text: just provide the trigger prefix, the candidate list, query parsing, and the inserted text:

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

| Member | Description |
| --- | --- |
| `triggerText` | Trigger prefix. |
| `suggestions` | All candidate texts. |
| `findQuery(textBefore, textAfter, range)` | Extracts the query word from the text before the cursor. |
| `beforeApply(suggest)` | Returns the Markdown text to insert for the selected item. |

`TextSuggest` already implements `getSuggestions()` (filters by containment and sorts), `getSuggestionId()`, and `getSuggestionById()`.



## EditorSuggest

Extend `EditorSuggest<T>` when you need to render rich-text suggestions or use custom suggestion objects:

```ts
abstract class EditorSuggest<T> {
  abstract triggerText: string

  canTrigger(textBefore: string, textAfter: string, range: TRange): boolean
  abstract findQuery(textBefore: string, textAfter: string, range: TRange):
    { isMatched: boolean, query?: string }

  abstract getSuggestions(query: string): NonNullable<T>[]
  abstract getSuggestionId(suggest: NonNullable<T>): string
  abstract getSuggestionById(id: string): NonNullable<T>

  /** returns an HTML string */
  renderSuggestion(suggest: NonNullable<T>): string
  /** returns the Markdown to insert */
  abstract beforeApply(suggest: NonNullable<T>): string

  lengthOfTextBeforeToBeReplaced(query: string): number
}
```

| Member | Description |
| --- | --- |
| `canTrigger()` | Whether to handle this input. By default returns `true` as long as there is text before the cursor. |
| `findQuery()` | Decides whether the trigger condition matches and extracts the query word. |
| `getSuggestions()` | Returns the candidate list for the query word. |
| `getSuggestionId()` | Unique id of a suggestion object, used to look it up when clicking to select. |
| `getSuggestionById()` | Retrieves a suggestion object by id. |
| `renderSuggestion()` | Returns the HTML string for a suggestion. |
| `beforeApply()` | Returns the Markdown finally inserted into the editor. |
| `lengthOfTextBeforeToBeReplaced()` | Length of the text before the cursor to replace when applying a suggestion; defaults to `query.length + triggerText.length`. |

Execution flow:

```
canTrigger → findQuery → show → getSuggestions → renderSuggestion
→ user selects → lengthOfTextBeforeToBeReplaced → getSuggestionById → beforeApply
```



## Examples

- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets) triggers with `/`
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag) triggers with `#`
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink) triggers with `[[`
