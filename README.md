# Typora Community Plugin

English | [简体中文](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/README.zh-CN.md)

A community plugin system for [Typora](https://typora.io/). Inspired by [Obsidian plugin system](https://docs.obsidian.md/Home).

**WARNING**: Third-party plugins may have data or privacy risks.

To be on the safe side, install an open source plugin that can review the source code.



## Packages

<details>
  <ul>
    <li><em>installer</em>: Inject <em>loader</em> to Typora. </li>
    <li><em>loader</em>: Decide to load which <em>core</em> (production or development).</li>
    <li><em>core</em>: Setup an environment for extending Typora and managing plugins.</li>
    <li><em>types</em>: Types of Typora global variables.</li>
    <li><em>esbuild-plugin</em>: Build <em>core</em> or plugin with esbuild.</li>
  </ul>
</details>



## Compatible

| Tested |                 |                 |             |
| :----: | --------------- | --------------- | ----------- |
| Typora | v1.5.x - v1.8.x | v1.5.x - v1.6.x | v1.4.8      |
| OS     | Windows 10      | Ubuntu 22       | macOS 10.13 |



## Features

- Plugin Manage
  - [x] Install/Uninstall/Update plugin
  - [x] Enable/Disable plugin
- New UI components
  - [x] Ribbon
  - [x] (Virtual) Multi File Tabs
- [x] Custom command hotkey
- APIs to extend Typora
  - [x] Markdown preprocessor
  - [x] Markdown postprocessor
  - [x] Markdown suggestion
- [x] I18n: follow system or manual configure, now support English and Chinese
- [x] Compatible with macOS
- Documentation
  - [ ] User documentation
  - [ ] Developer documentation



## Preview

| Ribbon & Multi File Tabs              | Command Panel                             |
| :-----------------------------------: | :---------------------------------------: |
| ![](./docs/assets/base.jpg)           | ![](./docs/assets/command-modal.jpg)      |
| Settings Modal                        | Plugin Marketplace                        |
| ![](./docs/assets/settings-modal.jpg) | ![](./docs/assets/plugin-marketplace.jpg) |



### Plugins

You can install plugins in the Plugin Marketplace

| Plugins                          | Description                                               |
| -------------------------------- | --------------------------------------------------------- |
| [callout][p1]                    | Support Obsidian-like Callout `> [!type]`.                |
| [codeblock-copy-button][p2]      | Add a copy button to each codeblock's top-right corner.   |
| [codeblock-highlight-mapper][p3] | Map language A to language B for highlighting it.         |
| [collapsible-section][p4]        | Fold/unfold markdown section.                             |
| [file-icon][p5]                  | Show different icon for different file type in file tree. |
| [front-matter][p6]               | Auto edit front matter.                                   |
| [note-refactor][p7]              | Extract selection to new file.                            |
| [note-snippets][p8]              | Use slash command to autocomplete note snippets.          |
| [tag][p9]                        | Support tag like `#tag`.                                  |
| [wikilink][p10]                  | Suport wikilink like `[[text]]`.                          |



## Install

See [How to install](./docs/en-us/user-guide/1-installation.md)



## Usage

### Hotkeys

| Hotkey                      | Function            |
| --------------------------- | ------------------- |
| <kbd>F1</kbd>               | Open Command Panel  |
| <kbd>Ctrl</kbd>+<kbd>.</kbd>| Open Settings Modal |



## Uninstall

See [How to uninstall](./docs/en-us/user-guide/2-uninstall.md)



## Contributing

Welcome to create pull requests.



## Support

If you have any problem or suggestion please open an issue [here](https://github.com/typora-community-plugin/typora-community-plugin/issues).
