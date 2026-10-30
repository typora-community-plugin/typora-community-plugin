# Plugin Basics

## Structure

A plugin installation package is a zip file containing the following files:

| File | Required | Description |
| --- | --- | --- |
| `manifest.json` | Yes | The plugin's [metadata](#metadata). |
| `main.js` | Yes | The plugin's [implementation](#implementation). |
| `style.css` | No | The plugin's UI styles. If missing, no error is raised; styles are simply not injected. |



## Metadata

`manifest.json` contains the information used to display the plugin in the marketplace and to decide whether the plugin can run based on version and platform.

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique identifier of the plugin. You may use a dot-separated namespace such as `author.name`, replacing punctuation and whitespace with hyphens. |
| `name` | `string` | Display name of the plugin. Shown in the marketplace and in the installed plugins list. |
| `description` | `string` | Plugin description. |
| `author` | `string` | Plugin author. |
| `authorUrl` | `string` | Author's homepage. A GitHub profile works. |
| `repo` | `string` | GitHub repository address, without the GitHub host name, e.g. `typora-community-plugin/typora-plugin-example`. |
| `version` | `string` | Plugin version. |
| `minAppVersion` | `string` | Minimum Typora version supported by the plugin. |
| `minCoreVersion` | `string` | Minimum typora-community-plugin version supported by the plugin. |
| `platforms` | `Array<"win32" \| "linux" \| "darwin">` | Operating systems supported by the plugin. |

> **Notes**
>
> - `position` (`"global" | "vault"`) and `dir` (absolute path of the plugin directory) are runtime fields injected by core when loading. Do not put them in `manifest.json`.
> - Currently core only strictly validates `minCoreVersion` when enabling a plugin; `minAppVersion` and `platforms` are mainly used by the plugin marketplace.



## Implementation

`main.js` exports a plugin implementation class extending `Plugin`, which is instantiated by the plugin manager when the plugin is loaded:

```ts
import { Plugin } from '@typora-community-plugin/core'


export default class extends Plugin {

  onload() {
    // initialization
  }

  onunload() {
    // resource disposal (optional; prefer this.register())
  }
}
```



### Lifecycle

The lifecycle of the plugin implementation class is managed by the `Plugin` base class (`Component`):

- `onload()` is called when loading;
- `onunload()` is called when unloading, followed by the cleanup functions collected via `this.register()`, and finally child components are unloaded.

Prefer the `register` family of methods to manage resources automatically:

```ts
export default class extends Plugin {
  onload() {
    this.registerDomEvent(window, 'resize', () => { /* ... */ })
    this.registerInterval(setInterval(() => { /* ... */ }, 1000))
    this.register(this.app.vault.on('mounted', path => { /* ... */ }))
  }
}
```



### Component

`Plugin` extends `Component`, so the following lifecycle and resource management methods are also available:

| Method | Description |
| --- | --- |
| `load()` / `unload()` | Load / unload the component. Usually called by the plugin manager. |
| `addChild(component)` | Add a child component; if the current component is already loaded, `load()` is called on the child immediately. Returns a removal function. |
| `removeChild(component)` | Unload and remove a child component. |
| `register(disposable)` | Register a cleanup function. |
| `unregister(disposable)` | Run and remove a cleanup function immediately. |
| `registerDomEvent(target, event, callback, options?)` | Register a DOM event. |
| `registerInterval(intervalId)` | Register a timer. |

If your plugin contains objects that should follow the plugin lifecycle (for example panes, views, or editor extensions), make them extend `Component` and manage them with `addChild()`:

```ts
import { Component, Plugin } from '@typora-community-plugin/core'

class MyFeature extends Component {
  onload() { /* ... */ }
  onunload() { /* ... */ }
}

export default class extends Plugin {
  onload() {
    this.addChild(new MyFeature())
  }
}
```



### Plugin Members

| Member | Type | Description |
| --- | --- | --- |
| `app` | `App` | The core `App` instance, giving access to all extension points. |
| `manifest` | `PluginManifest` | Metadata of the current plugin; at runtime it includes `dir` and `position`. |
| `settings` | `PluginSettings<T>` | Readable and writable after registering via `registerSettings()`. Accessing it without registration throws. |
| `dataPath` | `string` | Settings file path: `<configDir>/data/<manifest.id>.json`. Note that this is not the plugin directory. |
| `registerSettings(settings)` | `void` | Register a `PluginSettings` instance and load the settings file. |
| `registerSettingTab(tab)` | `void` | Register a settings page, shown under the "Plugins" group of the settings modal. |
| `registerCommand(command)` | `void` | Register a command, automatically prefixing id/title with the plugin. |
| `registerMarkdownEvent(event, listener)` | `void` | Listen to `MarkdownEditor` events and unbind automatically. |
| `registerMarkdownPreProcessor(processor)` | `void` | Register a [Markdown preprocessor](./3-md-preprocessor.md). |
| `registerMarkdownPostProcessor(processor)` | `void` | Register a [Markdown postprocessor](./3-md-postprocessor.md). |
| `registerMarkdownSuggest(suggest)` | `void` | Register a [suggestion](./3-suggestion.md). The old spelling `registerMarkdownSugguest` (three `g`s) is still kept as a compatibility alias. |
| `registerScript(relativePath)` / `importScript(relativePath)` | `void` / `DisposeFunc` | Insert a `<script>` using a path relative to the plugin directory. |
| `registerCss(relativePath)` / `importCss(relativePath)` | `void` / `DisposeFunc` | Insert a `<link rel="stylesheet">` using a path relative to the plugin directory. |
| `addStatusBarItem(options?)` | `HTMLElement` | Add an element to the bottom status bar; removed automatically on unload. |
| `register(disposable)` | `void` | Register a cleanup function, run on unload. |
| `registerDomEvent(target, event, callback, options?)` | `void` | Register a DOM event listener, unbound automatically on unload. |
| `registerInterval(intervalId)` | `void` | Register a timer, `clearInterval`-ed automatically on unload. |

> **Note**: The `Plugin` base class has **no** `i18n` member. All `this.i18n` usages in these docs are fields declared by the plugin itself; see [I18n](./3-locales.md).



### API

Typora's native API can be accessed through `typora` (an alias of the [`@typora-community-plugin/typora-types`](https://www.npmjs.com/package/@typora-community-plugin/typora-types) module).

> It can in fact be accessed directly via globals, but this module provides type definitions (Typora has no official ones, though some were reverse-engineered).

```js
import { editor } from "typora"
```



The APIs wrapped by typora-community-plugin can be accessed through the [`@typora-community-plugin/core`][^core] module.

> This module provides type definitions and the development build of core for debugging.

```js
import { Plugin } from "@typora-community-plugin/core"
```



Both modules are already included in the template project; just remember to keep them updated.



### Extension Points

An extension point is a set of predefined APIs where you pass data or functions to configure and achieve predefined features or UI.

> Similar concepts include Eclipse's [Extension Points](https://wiki.eclipse.org/Extension_points) and VSCode's [Contribution Points](https://code.visualstudio.com/api/references/contribution-points).



Extension points currently provided by the [`@typora-community-plugin/core`][^core] module:

| Extension Point | Description |
| --- | --- |
| [Command](./3-command.md) | Invoke plugin features from the command palette. |
| [Event](./3-events.md) | Listen to Typora, workspace, editor, and DOM events. |
| [Hotkey](./3-hotkey.md) | Trigger plugin features via keyboard shortcuts. |
| [Settings Storage](./3-settings.md) | Read, write, and persist plugin configuration. |
| [Settings Page](./3-settings-ui.md) | Configure the plugin in the settings modal. |
| [Sidebar](./3-sidebar.md) | Show custom panes in the activity bar/sidebar. |
| [Statistics](./3-statistics.md) | Show custom statistics in the word-count panel. |
| [Markdown Preprocessor](./3-md-preprocessor.md) | Replace text with functions before Markdown is rendered. |
| [Markdown Postprocessor](./3-md-postprocessor.md) | Modify the editor DOM after Markdown is rendered. |
| [Suggestion](./3-suggestion.md) | Trigger the suggestion list with a given punctuation character. |
| [I18n](./3-locales.md) | Load UI strings from JSON files or code. |
| [Export](./3-export.md) | Modify exported HTML. |
| [Workspace and Custom Views](./4-workspace.md) | Register custom views opened by specific file extensions, and manipulate tabs and splits. |
| [General UI](./4-ui.md) | `Notice`, `Modal`, quick input, quick pick, and the status bar. |
| [Metadata API](./4-metadata.md) | Build a queryable, persistent metadata index for files. |



### Compatibility Layer

To be compatible with both Typora on Windows/Linux (which provides Node.js) and macOS (which does not), the [`@typora-community-plugin/core`][^core] module provides cross-platform versions of `fs`, `path`, and `os`.

```js
import { fs, path, os } from "@typora-community-plugin/core"
```

They are not full implementations of the Node.js modules:

- `fs` is a `FileAdapter` instance providing common asynchronous file operations;
- `path` only implements `sep`, `isAbsolute`, `basename`, `extname`, `dirname`, `join`, and `relative`;
- `os` only implements `arch`, `homedir`, `hostname`, `platform`, and `type`.

See [Utilities and Cross-Platform Compatibility Layer](./4-utils.md) for details.



[^core]: https://www.npmjs.com/package/@typora-community-plugin/core
