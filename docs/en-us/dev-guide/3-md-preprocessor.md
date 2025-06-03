# Markdown Preprocessor

## Functionality

- Before rendering Markdown, use functions to replace text
- After saving Markdown, use functions to restore text

This can be used to implement custom syntax.

**Note**: It may affect the opening performance of large files (files with 1k+ lines), please use it with caution and test with large files. Try to use [Markdown Postprocessor](./3-md-postprocessor.md) or other methods instead.

## Registration

After registering with the Plugin method `registerMarkdownPreProcessor()`, it will be automatically removed when the plugin is uninstalled.

## Examples

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag) uses regular expressions to replace `#tag` with `<i alt="tag">#tag</i>` to support tags
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink) uses regular expressions to replace `[[link]]` with `<a>[[link]]</a>` to support wikilinks
