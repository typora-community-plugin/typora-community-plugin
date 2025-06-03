# Auto-completion

Use specified punctuation to trigger the auto-completion list.



## Usage

Use `registerMarkdownSuggest()` to register a custom `Suggest` instance:

```ts
// typora-plugin-note-snippets /src/main.ts

this.registerMarkdownSuggest(this.suggest)
```

The custom `Suggest` inherits from `EditorSuggest` (or its subclass `TextSuggest`).



## Examples

- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets) uses `/` to trigger
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag) uses `#` to trigger
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink) uses `[[` to trigger
