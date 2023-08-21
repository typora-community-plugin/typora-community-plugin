# Typora Community Plugin

English | [简体中文](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/README.zh-CN.md)

A community plugin system for [Typora](https://typora.io/). Inspired by [Obsidian plugin system](https://marcus.se.net/obsidian-plugin-docs/).

**WARNING**: Third-party plugins may have data or privacy risks.



## Packages

- `installer`: Inject `loader` to Typora. 
- `loader`: Decide to load which `core` (production or development).
- `core`: Setup an environment for extending Typora and managing plugins.
- `types`: Types of Typora global variables.
- `esbuild-plugin`: Build `core` or plugin with esbuild.



## Compatible

| Core version | tested Typora | Windows | Linux | MacOS |
| ------------ | ------------- | ------- | ----- | ----- |
| v2+          | v1.5+         | ✅      | ❌    | ❌    |

- ✅: tested in this platform
- ❌: not test in this platform



## Features

- Plugin Manage
  - Install/Uninstall plugin
  - Enable/Disable plugin
- New UI components
  - Ribbon
  - (Virtual) Multi File Tabs
- Custom command hotkey
- APIs to extend Typora
  - Markdown preprocessor
  - Markdown postprocessor
  - Markdown suggestion
- I18n: auto follow system, now support English and Chinese



## Preview

| Ribbon & Multi File Tabs              | Command Panel                             |
| :-----------------------------------: | :---------------------------------------: |
| ![](./docs/assets/base.jpg)           | ![](./docs/assets/command-modal.jpg)      |
| Settings Modal                        | Plugin Marketplace                        |
| ![](./docs/assets/settings-modal.jpg) | ![](./docs/assets/plugin-marketplace.jpg) |



## Install

### Script install

1. Download [Release](https://github.com/typora-community-plugin/typora-community-plugin/releases) `typora-community-plugin.zip`.
2. Unzip it.
3. Run as Admin `install.ps1` (only for Windows) to install.

### Manual install

1. Download [Release](https://github.com/typora-community-plugin/typora-community-plugin/releases) `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `%UserProfile%/.typora/comunity-plugins`.
4. Create a symlink. Run `cmd` as admin, and run command `mklink /d %UserProfile%\\AppData\\Roaming\\Typora\\plugins %UserProfile%\\.typora\\community-plugins`.
5. Modify `{TyporaHome}/resources/window.html`. Open the file with encoding UTF-8, then replace text `</body></html>` at the end of file as `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`.



## Usage

### Hotkeys

| Hotkey                      | Function            |
| --------------------------- | ------------------- |
| <kbd>F1</kbd>               | Open Command Panel  |
| <kbd>Ctrl</kbd>+<kbd>.</kbd>| Open Settings Modal |


## Contributing

Welcome to create pull requests.



## Support

If you have any problem or suggestion please open an issue [here](https://github.com/typora-community-plugin/typora-community-plugin/issues).
