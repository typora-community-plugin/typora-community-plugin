# Typora Community Plugin

English | [简体中文](https://github.com/typora-community-plugin/typora-community-plugin/blob/main/README.zh-CN.md)

A community plugin system for [Typora](https://typora.io/). Inspired by [Obsidian plugin system](https://docs.obsidian.md/Home).

**WARNING**: Third-party plugins may have data or privacy risks.

To be on the safe side, install an open source plugin that can review the source code.



## Packages

- `installer`: Inject `loader` to Typora. 
- `loader`: Decide to load which `core` (production or development).
- `core`: Setup an environment for extending Typora and managing plugins.
- `types`: Types of Typora global variables.
- `esbuild-plugin`: Build `core` or plugin with esbuild.



## Compatible

| tested Typora  | Windows     | Linux    | MacOS |
| -------------- | ----------- | -------- | ----- |
| v1.5.x, v1.6.x | ✅Window 10 | ✅Ubuntu | ❌    |

- ✅: tested in this platform
- ❌: not support in this platform



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
- [ ] Compatible with macOS
- Documentation
  - [ ] User documentation
  - [ ] Developer documentation



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
3. Run `install.ps1` (only for Windows) as Admin to install. <br> If you want to install it for custom Typora installed directory, run `install.ps1 -root <TyporaHome>` as Admin.

### Manual install

for Windows

1. Download [Release](https://github.com/typora-community-plugin/typora-community-plugin/releases) `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `%UserProfile%/.typora/community-plugins`.
4. Create a symlink. Run `cmd` as admin, and run command `mklink /d %UserProfile%\\AppData\\Roaming\\Typora\\plugins %UserProfile%\\.typora\\community-plugins`.
5. Modify `{TyporaHome}/resources/window.html`. Open the file with encoding UTF-8, then replace text `</body></html>` at the end of file as `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`.

for Linux

1. Download [Release](https://github.com/typora-community-plugin/typora-community-plugin/releases) `typora-community-plugin.zip`.
2. Unzip it.
3. Copy files to `~/.config/Typora/plugins`.
4. Modify `/usr/share/typora/resources/window.html`。Open the file with encoding UTF-8, then replace text `</body></html>` at the end of file as `<script src="typora://app/userData/plugins/loader.js" type="module"></script></body></html>`.



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
