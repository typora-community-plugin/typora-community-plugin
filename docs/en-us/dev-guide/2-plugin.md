# Plugin Basics

## Structure

A plugin installation package is a zip file that contains 3 parts:

| File          | Description                      |
| ------------- | ------------------------------- |
| manifest.json | Plugin's [metadata](#metadata). |
| main.js       | Plugin's [function implementation](#function-implementation). |
| style.css     | Plugin's UI style.              |



## Metadata

manifest.json contains information used to display in the plugin market and to determine whether the plugin can run based on version and platform.

| Metadata Name       | Type                                 | Description                                                     |
| ------------------- | ------------------------------------ | ------------------------------------------------------------- |
| `id`                | `string`                             | Unique identifier for the plugin. Can use a namespace `author.name` separated by periods as `id`, where punctuation and spaces are replaced with hyphens. |
| `name`              | `string`                             | Display name of the plugin. Shown in the plugin market and installed plugin list. |
| `description`       | `string`                             | Description of the plugin.                                    |
| `author`            | `string`                             | Author of the plugin.                                        |
| `authorUrl`         | `string`                             | Author's homepage. Can use GitHub homepage.                  |
| `repo`              | `string`                             | GitHub repository address. Does not include GitHub hostname, e.g.: `typora-community-plugin/typora-plugin-example`. |
| `version`           | `string`                             | Plugin version number.                                       |
| `minAppVersion`     | `string`                             | Minimum Typora version supported by the plugin.              |
| `minCoreVersion`    | `string`                             | Minimum typora-community-plugin version supported by the plugin. |
| `platforms`         | Array\<"win32" \| "linux" \| "darwin"> | Operating systems supported by the plugin.                  |



## Function Implementation

main.js exports a plugin implementation class that inherits from the Plugin class, which will be instantiated when loaded.

```ts
import { Plugin } from '@typora-community-plugin/core'


export default class extends Plugin {

  onload() {
    // Initialization
  }

  onunload() {
    // Resource release
  }
}
```



### Lifecycle

Plugin implementation class

- When loading, the `onload()` method will be called for initialization;
- When unloading, the `onunload()` method will be called for resource release.



### API

The Typora native API can be accessed through `typora` (an alias for the module [`@typora-community-plugin/typora-types`](https://www.npmjs.com/package/@typora-community-plugin/typora-types)).

> It can actually be accessed directly from the global variable, but this module provides type definitions (the official has no type definitions, but some debug-derived type definitions exist).

```js
import { editor } from "typora"
```



The API encapsulated by typora-community-plugin can be accessed through the module [`@typora-community-plugin/core`][^core].

> This module provides type definitions and a development version of the core package for debugging.

```js
import { Plugin } from "@typora-community-plugin/core"
```



These two modules have already been imported in the template project, just make sure to update as needed.



#### Extension Points

Extension points refer to a set of pre-defined APIs that can receive data and functions for configuration to achieve predefined functions and interfaces.

> Similar concepts include Eclipse's [Extension Points](https://wiki.eclipse.org/Extension_points) and VSCode's [Contribution Points](https://code.visualstudio.com/api/references/contribution-points).



The extension points currently provided by the module [`@typora-community-plugin/core`][^core]:

| Extension Point                                         | Description                               |
| ------------------------------------------------------ | ----------------------------------------- |
| [Commands](./3-command.md)                             | Call plugin functions from the command panel |
| [Events](./3-events.md)                                | Trigger plugin functions by Typora or DOM events |
| [Hotkeys](./3-hotkey.md)                               | Trigger plugin functions via hotkeys     |
| UI.Editor.[Markdown Preprocessor](./3-md-preprocessor.md)  | Replace text using functions before rendering Markdown |
| UI.Editor.[Markdown Postprocessor](./3-md-postprocessor.md) | Modify editor DOM after rendering Markdown |
| UI.Editor.[Autocomplete](./3-suggestion.md)            | Trigger autocomplete list with specified punctuation |
| UI.[Sidebar](./3-sidebar.md)                           | Pressing the active bar icon can display a specified panel in the sidebar |
| UI.[Settings Page](./3-settings.md)                    | Configure the plugin on the settings page |
| [Multilingual](./3-locales.md)                         | Load strings for the UI from JSON       |



#### Compatibility Layer

To accommodate Typora versions for Windows/Linux (which provide Node.js) and macOS (which does not provide Node.js), the module [`@typora-community-plugin/core`][^core] provides a cross-platform version of Node.js modules `fs` and `path`.

```js
import { fs, path } from "@typora-community-plugin/core"
```



[^core]: https://www.npmjs.com/package/@typora-community-plugin/core
