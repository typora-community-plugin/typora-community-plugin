# Typora Community Plugin

English | [简体中文](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/README.zh-CN.md)

A community plugin system for [Typora](https://typora.io/). Inspired by [Obsidian plugin system](https://docs.obsidian.md/Home).

**WARNING**: Third-party plugins may have data or privacy risks.

To be on the safe side, install an open source plugin that can review the source code.



## Preview

| Ribbon & Multi File Tabs              | Command Panel                             |
| :-----------------------------------: | :---------------------------------------: |
| ![](./docs/assets/base.jpg)           | ![](./docs/assets/command-modal.jpg)      |
| Settings Modal                        | Plugin Marketplace                        |
| ![](./docs/assets/settings-modal.jpg) | ![](./docs/assets/plugin-marketplace.jpg) |



## Compatible

| Tested |                 |                 |                 |
| :----: | --------------- | --------------- | --------------- |
| Typora | v1.5.x - v1.9.x | v1.5.x - v1.9.x | v1.4.8 - v1.9.4 |
| OS     | Windows 10      | Ubuntu 22       | macOS 10.13, 14 |



## Features <small>([CHANGELOG](./docs/en-us/user-guide/CHANGELOG.md))</small>

- Plugin Manage
  - [x] Install/Uninstall/Update plugin
  - [x] Enable/Disable plugin
- New UI components
  - [x] Ribbon
  - [x] (Virtual) Multi File Tabs
- [x] Custom command hotkey
- [x] I18n: follow system or manual configure, now support English and Chinese
- [x] Compatible with macOS



### Plugins

You can [install plugins](./docs/en-us/user-guide/2-plugin-installation.md) from the Plugin Marketplace:

| Plugins                          | Description                                               |
| -------------------------------- | --------------------------------------------------------- |
| [abcjs][p12]                     | Use ABC music notation in codeblock.                      |
| [callout][p1]                    | Support Obsidian-like Callout `> [!type]`.                |
| [codeblock-copy-button][p2]      | Add a copy button to each codeblock's top-right corner.   |
| [codeblock-highlight-mapper][p3] | Map language A to language B for highlighting it.         |
| [collapsible-section][p4]        | Fold/unfold markdown section. Supports headings, list, codeblock, table. |
| [code-folding][p14]              | Make your codes foldable.                                 |
| [darkmode][p13]                  | General dark mode for any theme.                          |
| [file-icon][p5]                  | Show different icon for different file type in file tree. |
| [footnotes][p18]                 | Re-index the numerical footnotes.                         |
| [front-matter][p6]               | Auto edit front matter.                                   |
| [image-location][p15]            | Resolve image's location relative to vault's root.        |
| [image-viewer][p16]              | View all the images in the current Markdown.              |
| [markmap][p11]                   | Support Markmap in codeblock.                             |
| [note-refactor][p7]              | Extract selection to new file.                            |
| [note-snippets][p8]              | Use slash command to autocomplete note snippets.          |
| [tag][p9]                        | Support tag like `#tag`.                                  |
| [wavedrom][p17]                  | Support WaveDrom in codeblock.                            |
| [wikilink][p10]                  | Suport wikilink like `[[text]]`.                          |



## User Documentation

- [How to install](./docs/en-us/user-guide/1a-installation.md)
- [Install plugin in Marketplace](./docs/en-us/user-guide/2-plugin-installation.md)
- [How to uninstall](./docs/en-us/user-guide/1b-uninstall.md)



### Hotkeys

| Hotkey                      | Function            |
| --------------------------- | ------------------- |
| <kbd>F1</kbd>               | Open Command Panel  |
| <kbd>Ctrl</kbd>+<kbd>.</kbd>| Open Settings Modal |



## Contributing

Welcome to create pull requests.



## Support

If you have any problem or suggestion please open an issue [here](https://github.com/typora-community-plugin/typora-community-plugin/issues).



[p1]: https://github.com/typora-community-plugin/typora-plugin-callout
[p2]: https://github.com/typora-community-plugin/typora-plugin-codeblock-copy-button
[p3]: https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper
[p4]: https://github.com/typora-community-plugin/typora-plugin-collapsible-section
[p5]: https://github.com/typora-community-plugin/typora-plugin-file-icon
[p6]: https://github.com/typora-community-plugin/typora-plugin-front-matter
[p7]: https://github.com/typora-community-plugin/typora-plugin-note-refactor
[p8]: https://github.com/typora-community-plugin/typora-plugin-note-snippets
[p9]: https://github.com/typora-community-plugin/typora-plugin-tag
[p10]: https://github.com/typora-community-plugin/typora-plugin-wikilink
[p11]: https://github.com/typora-community-plugin/typora-plugin-markmap
[p12]: https://github.com/typora-community-plugin/typora-plugin-abcjs
[p13]: https://github.com/typora-community-plugin/typora-plugin-darkmode
[p14]: https://github.com/typora-community-plugin/typora-plugin-code-folding
[p15]: https://github.com/typora-community-plugin/typora-plugin-image-location
[p16]: https://github.com/typora-community-plugin/typora-plugin-image-viewer
[p17]: https://github.com/typora-community-plugin/typora-plugin-wavedrom
[p18]: https://github.com/typora-community-plugin/typora-plugin-footnotes
