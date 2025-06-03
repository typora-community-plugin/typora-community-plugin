# Markdown Post Processor

After rendering Markdown, modify the editor DOM. This can be used to add non-text editing functionalities.

## Types

| Class                       | Description                              | Example                                                       |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `PostProcessor`             | Basic post processor                     | -                                                             |
| `CodeblockPostProcessor`    | Code block post processor. Supports adding buttons and rendering content. | [typora-plugin-codeblock-copy-button](https://github.com/typora-community-plugin/typora-plugin-codeblock-copy-button) adds a copy button to code blocks |
| `HtmlPostProcessor`         | HTML post processor. Supports adding buttons. | [typora-plugin-collapsible-section](https://github.com/typora-community-plugin/typora-plugin-collapsible-section) adds a collapse button to headers |

## Registration

After registering with the Plugin method `registerMarkdownPostProcessor()`, it will be automatically removed when the plugin is uninstalled.
