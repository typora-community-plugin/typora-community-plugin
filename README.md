# Typora Community Plugin

A community plugin system for [Typora](https://typora.io/). Inspired by [Obsidian plugin system](https://marcus.se.net/obsidian-plugin-docs/).

**WARNING**: Third-party plugins may have data or privacy risks.



## Packages

- `installer`: Inject `loader` to Typora. 
- `loader`: Decide to load which `core` (production or development).
- `core`: Setup an environment for extending Typora and managing plugins.



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
  - (Fake) Multi File Tabs
- Custom command hotkey
- APIs to extend Typora
  - Markdown preprocessor
  - Markdown postprocessor
  - Markdown suggestion
- I18n: auto follow system, now support English and Chiness



## Preview

![](https://fastly.jsdelivr.net/gh/typora-community-plugin/typora-community-plugin@latest/docs/assets/base.jpg)

![](https://fastly.jsdelivr.net/gh/typora-community-plugin/typora-community-plugin@latest/docs/assets/command-modal.jpg)

![](https://fastly.jsdelivr.net/gh/typora-community-plugin/typora-community-plugin@latest/docs/assets/settings-modal.jpg)



## Contributing

Welcome to create pull requests.



## Support

If you have any problem or suggestion please open an issue [here](https://github.com/typora-community-plugin/typora-community-plugin/issues).
