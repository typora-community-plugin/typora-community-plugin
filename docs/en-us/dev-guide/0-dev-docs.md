# Development Documentation

[Typora](https://typora.io/) is a cross-platform Markdown editor. It does not provide a plugin system of its own, so [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) provides a plugin system for Typora to the community, modeled after the [Obsidian plugin system](https://docs.obsidian.md/Home).

This documentation is written against `@typora-community-plugin/core` v2.10.x.



## Reading Path

1. [Quick Start](./1-getting-started.md): Create a project, compile and run your first plugin.
2. [Plugin Basics](./2-plugin.md): Plugin package structure, manifest fields, and the `Plugin` base class.
3. Extension points:
   - [Commands](./3-command.md), [Events](./3-events.md), [Hotkeys](./3-hotkey.md)
   - [Settings Storage](./3-settings.md), [Settings UI](./3-settings-ui.md)
   - [Sidebar](./3-sidebar.md), [Statistics](./3-statistics.md)
   - [Markdown Preprocessor](./3-md-preprocessor.md), [Markdown Postprocessor](./3-md-postprocessor.md), [Suggestion](./3-suggestion.md)
   - [I18n](./3-locales.md), [Export](./3-export.md)
4. Advanced capabilities:
   - [Workspace and Custom Views](./4-workspace.md)
   - [General UI Components](./4-ui.md)
   - [Metadata API](./4-metadata.md)
   - [Utilities and Cross-Platform Compatibility Layer](./4-utils.md)
5. [Releasing](./9-releasing.md): Package, create a Release, and publish to the plugin marketplace.



## Packages

| Package | Description |
| --- | --- |
| `installer` | Injects `loader` into Typora. |
| `loader` | Decides which version of `core` to load (production or development). |
| `core` | Provides the APIs for extending Typora and manages plugins. |
| `types` | Types for Typora's global variables. |
| `esbuild-plugin` | Builds `core` and plugins with esbuild. |
| `rollup-plugin` | Builds plugins with Rollup, mapping `typora` and `@typora-community-plugin/core` to runtime global variables. |



## Development Features

- UI extension
  - [x] Ribbon and custom panes
  - [x] Status bar buttons
  - [x] Settings page and settings modal
  - [x] Custom workspace views (tabs, horizontal splits, right sidebar, floating windows)
- APIs to extend Typora
  - [x] Commands, events, hotkeys
  - [x] Markdown preprocessor / postprocessor / suggestion
  - [x] Codeblock languages and preview rendering
  - [x] Statistics rows (word-count panel)
  - [x] Export processors
  - [x] Metadata API
- [x] Plugin settings storage and version field
- [x] I18n: follow system or configure manually; core ships with English, Simplified Chinese, and German
- [x] Compatible with Windows / Linux / macOS
- [x] Auto re-launch Typora after compiled code
