# Development Documentation



## Packages

- `installer`: Inject `loader` to Typora. 
- `loader`: Decide to load which `core` (production or development).
- `core`: Setup an environment for extending Typora and managing plugins.
- `types`: Types of Typora global variables.
- `esbuild-plugin`: Build `core` or plugin with esbuild.



## Features

- UI Extension
  - [x] Ribbon
  - [x] (Virtual) Multi File Tabs
- [x] Custom command hotkey
- APIs to extend Typora
  - [x] Markdown preprocessor
  - [x] Markdown postprocessor
  - [x] Markdown suggestion
- [x] I18n: follow system or manual configure, now support English and Chinese
- [x] Compatible with macOS
- [x] Auto re-launch Typora after compiled code
