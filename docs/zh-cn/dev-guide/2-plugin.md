# 插件基础

## 结构

一个插件的安装包是一个 zip 文件，包含以下文件：

| 文件 | 是否必需 | 描述 |
| --- | --- | --- |
| `manifest.json` | 是 | 插件的[元数据](#元数据)。 |
| `main.js` | 是 | 插件的[功能实现](#功能实现)。 |
| `style.css` | 否 | 插件的 UI 样式。缺少时不会报错，只是不注入样式。 |



## 元数据

`manifest.json` 包含了用于在插件市场展示，以及根据版本、平台决定插件是否能运行的信息。

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| `id` | `string` | 插件的唯一标识符。可以使用由句号分割的命名空间 `author.name`，其中的标点符号和空白使用连字符代替。 |
| `name` | `string` | 插件的展示名。显示在插件市场和已安装插件列表中。 |
| `description` | `string` | 插件描述。 |
| `author` | `string` | 插件作者。 |
| `authorUrl` | `string` | 作者的主页。可以使用 GitHub 主页。 |
| `repo` | `string` | GitHub 仓库地址。不包含 GitHub 主机名，如：`typora-community-plugin/typora-plugin-example`。 |
| `version` | `string` | 插件版本号。 |
| `minAppVersion` | `string` | 插件支持的最小 Typora 版本。 |
| `minCoreVersion` | `string` | 插件支持的最小 typora-community-plugin 版本。 |
| `platforms` | `Array<"win32" \| "linux" \| "darwin">` | 插件支持的操作系统。 |

> **注意**
>
> - `position`（`"global" | "vault"`）和 `dir`（插件目录绝对路径）是 core 在加载时注入的运行时字段，不要写进 `manifest.json`。
> - 当前 core 在启用插件时只强制校验 `minCoreVersion`；`minAppVersion` 与 `platforms` 主要由插件市场使用。



## 功能实现

`main.js` 中导出一个继承 `Plugin` 的插件实现类，它会在加载时由插件管理器实例化：

```ts
import { Plugin } from '@typora-community-plugin/core'


export default class extends Plugin {

  onload() {
    // 初始化
  }

  onunload() {
    // 资源释放（可选，推荐使用 this.register()）
  }
}
```



### 生命周期

插件实现类的生命周期由 `Plugin` 基类（`Component`）管理：

- 加载时调用 `onload()`；
- 卸载时调用 `onunload()`，随后执行 `this.register()` 收集的清理函数，最后卸载子组件。

推荐使用 `register` 系列方法自动管理资源：

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

`Plugin` 继承自 `Component`，因此还可以使用以下生命周期与资源管理方法：

| 方法 | 说明 |
| --- | --- |
| `load()` / `unload()` | 加载 / 卸载组件。通常由插件管理器调用。 |
| `addChild(component)` | 添加子组件；当前组件已加载时会立即 `load()` 子组件。返回移除函数。 |
| `removeChild(component)` | 卸载并移除子组件。 |
| `register(disposable)` | 登记清理函数。 |
| `unregister(disposable)` | 立即执行并移除清理函数。 |
| `registerDomEvent(target, event, callback, options?)` | 登记 DOM 事件。 |
| `registerInterval(intervalId)` | 登记定时器。 |

如果插件内部有需要跟随插件生命周期的对象（例如面板、视图、编辑器扩展），让它们继承 `Component` 并用 `addChild()` 管理：

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



### Plugin 成员

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `app` | `App` | core 的 `App` 实例，访问所有扩展点。 |
| `manifest` | `PluginManifest` | 当前插件的元数据，运行时包含 `dir` 与 `position`。 |
| `settings` | `PluginSettings<T>` | 通过 `registerSettings()` 注册后可读写。未注册时访问会抛错。 |
| `dataPath` | `string` | 设置文件路径：`<configDir>/data/<manifest.id>.json`。注意这不是插件目录。 |
| `registerSettings(settings)` | `void` | 注册 `PluginSettings` 实例并加载配置文件。 |
| `registerSettingTab(tab)` | `void` | 注册设置页，显示在设置弹窗的「插件」分组。 |
| `registerCommand(command)` | `void` | 注册命令，自动为 id/title 加插件前缀。 |
| `registerMarkdownEvent(event, listener)` | `void` | 监听 `MarkdownEditor` 事件并自动解绑。 |
| `registerMarkdownPreProcessor(processor)` | `void` | 注册 [Markdown 前处理器](./3-md-preprocessor.md)。 |
| `registerMarkdownPostProcessor(processor)` | `void` | 注册 [Markdown 后处理器](./3-md-postprocessor.md)。 |
| `registerMarkdownSuggest(suggest)` | `void` | 注册 [自动完成](./3-suggestion.md)。旧拼写 `registerMarkdownSugguest`（三个 `g`）仍作为兼容别名保留。 |
| `registerScript(relativePath)` / `importScript(relativePath)` | `void` / `DisposeFunc` | 以相对插件目录的路径插入 `<script>`。 |
| `registerCss(relativePath)` / `importCss(relativePath)` | `void` / `DisposeFunc` | 以相对插件目录的路径插入 `<link rel="stylesheet">`。 |
| `addStatusBarItem(options?)` | `HTMLElement` | 在底部状态栏添加元素，卸载时自动移除。 |
| `register(disposable)` | `void` | 登记清理函数，卸载时执行。 |
| `registerDomEvent(target, event, callback, options?)` | `void` | 登记 DOM 事件监听，卸载时自动解绑。 |
| `registerInterval(intervalId)` | `void` | 登记定时器，卸载时自动 `clearInterval`。 |

> **注意**：`Plugin` 基类 **没有** `i18n` 成员。文档示例中的 `this.i18n` 都是插件自己声明的字段，见[多语言](./3-locales.md)。



### API

可以通过 `typora`（是模块 [`@typora-community-plugin/typora-types`](https://www.npmjs.com/package/@typora-community-plugin/typora-types) 的别名）访问 Typora 原生 API。

> 其实可以从全局变量直接访问，但该模块提供了类型定义（官方没有类型定义，但有部分调试出来的类型定义）。

```js
import { editor } from "typora"
```



可以通过模块 [`@typora-community-plugin/core`][^core] 访问 typora-community-plugin 封装的 API。

> 该模块提供了类型定义和用于调试的开发版 core 包。

```js
import { Plugin } from "@typora-community-plugin/core"
```



这两个模块在模板项目中已经引入，只要注意更新即可。



### 扩展点

扩展点指的是一组带有预设 API，可以传入数据、函数进行配置以实现预设的功能、界面。

> 类似的还有 Eclipse 的[扩展点（Extension Points）](https://wiki.eclipse.org/Extension_points)、VSCode 的[贡献点（Contribution Points）](https://code.visualstudio.com/api/references/contribution-points)。



模块 [`@typora-community-plugin/core`][^core] 目前提供的扩展点：

| 扩展点 | 描述 |
| --- | --- |
| [命令](./3-command.md) | 从命令面板调用插件功能。 |
| [事件](./3-events.md) | 监听 Typora、工作区、编辑器与 DOM 事件。 |
| [快捷键](./3-hotkey.md) | 由快捷键触发插件功能。 |
| [设置存储](./3-settings.md) | 读写并持久化插件配置。 |
| [设置页](./3-settings-ui.md) | 在设置弹窗中配置插件。 |
| [侧边栏](./3-sidebar.md) | 在活动栏/侧边栏显示自定义面板。 |
| [统计行](./3-statistics.md) | 在词数面板中显示自定义统计。 |
| [Markdown 前处理器](./3-md-preprocessor.md) | 渲染 Markdown 之前，使用函数替换文本。 |
| [Markdown 后处理器](./3-md-postprocessor.md) | 渲染 Markdown 之后，修改编辑器 DOM。 |
| [自动完成](./3-suggestion.md) | 使用指定标点符号触发自动完成列表。 |
| [多语言](./3-locales.md) | 从 JSON 或代码加载用于 UI 的字符串。 |
| [导出](./3-export.md) | 修改导出的 HTML。 |
| [工作区与自定义视图](./4-workspace.md) | 注册以特定扩展名打开的自定义视图，操作标签页与分栏。 |
| [通用 UI](./4-ui.md) | `Notice`、`Modal`、快捷输入、快捷选择、状态栏。 |
| [Metadata API](./4-metadata.md) | 为文件建立可查询、可持久化的元数据索引。 |



### 兼容层

为了兼容 Windows/Linux（提供 Node.js） 和 macOS（不提供 Node.js） 版本的 Typora，模块 [`@typora-community-plugin/core`][^core] 提供了跨平台版本的 `fs`、`path` 和 `os`。

```js
import { fs, path, os } from "@typora-community-plugin/core"
```

它们不是完整的 Node.js 模块实现：

- `fs` 是 `FileAdapter` 实例，提供常用的异步文件操作；
- `path` 只实现 `sep`、`isAbsolute`、`basename`、`extname`、`dirname`、`join`、`relative`；
- `os` 只实现 `arch`、`homedir`、`hostname`、`platform`、`type`。

详见[工具函数与跨平台兼容层](./4-utils.md)。



[^core]: https://www.npmjs.com/package/@typora-community-plugin/core
