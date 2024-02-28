# 插件基础

## 结构

一个插件的安装包是一个 zip 文件，包含 3 部分：

| 文件          | 描述                          |
| ------------- | ----------------------------- |
| manifest.json | 插件的[元数据](#元数据)。     |
| main.js       | 插件的[功能实现](#功能实现)。 |
| style.css     | 插件的 UI 样式。              |



## 元数据

manifest.json 包含了用于在插件市场展示和根据版本、平台决定插件是否能运行的信息。

| 元数据名称       | 类型                                 | 描述                                                         |
| ---------------- | ------------------------------------ | ------------------------------------------------------------ |
| `id`             | `string`                             | 插件的唯一标识符。可以使用由句号分割的命名空间 `author.name` 来作为 `id`，其中的标点符号和空白使用连字符代替。 |
| `name`           | `string`                             | 插件的展示名。显示在插件市场和已安装插件列表中。             |
| `description`    | `string`                             | 插件描述。                                                   |
| `author`         | `string`                             | 插件作者。                                                   |
| `authorUrl`      | `string`                             | 作者的主页。可以使用 Github 主页。                           |
| `repo`           | `string`                             | Github 仓库地址。不包含 Github 主机名，如：`typora-community-plugin/typora-plugin-example`。 |
| `version`        | `string`                             | 插件版本号。                                                 |
| `minAppVersion`  | `string`                             | 插件支持的最小 Typora 版本。                                 |
| `minCoreVersion` | `string`                             | 插件支持的最小 typora-community-plugin 版本。                |
| `platforms`      | Array\<"win32" \| "linux" \| "darwin"> | 插件支持的操作系统。                                         |



## 功能实现

main.js 中导出一个继承 Plugin 类的插件实现类，它将会在加载时被实例化。

```ts
import { Plugin } from '@typora-community-plugin/core'


export default class extends Plugin {

  onload() {
    // 初始化
  }

  onunload() {
    // 资源释放
  }
}
```



### 生命周期

插件实现类

- 在加载时，会调用 `onload()` 方法进行初始化；
- 在卸载时， 会调用 `onunload()` 方法进行资源释放。



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



#### 扩展点

扩展点指的是一组带有预设 API，可以传入数据、函数进行配置以实现预设的功能、界面。

> 类似的还有 Eclipse 的[扩展点（Extension Points）](https://wiki.eclipse.org/Extension_points)、VSCode 的[贡献点（Contribution Points）](https://code.visualstudio.com/api/references/contribution-points)。



模块 [`@typora-community-plugin/core`][^core] 目前提供的扩展点：

| 扩展点                                                 | 描述                                     |
| ------------------------------------------------------ | ---------------------------------------- |
| [命令](./3-command.md)                                 | 从命令面板调用插件功能                   |
| [事件](./3-events.md)                                  | 由 Typora 或 DOM 事件触发插件功能        |
| [快捷键](./3-hotkey.md)                                | 由快捷键触发插件功能                     |
| UI.编辑器.[Markdown 前处理器](./3-md-preprocessor.md)  | 渲染 Markdown 之前，使用函数替换文本     |
| UI.编辑器.[Markdown 后处理器](./3-md-postprocessor.md) | 渲染 Markdown 之后，修改编辑器 DOM       |
| UI.编辑器.[自动完成](./3-suggestion.md)                | 使用指定标点符号触发自动完成列表         |
| UI.[侧边栏](./3-sidebar.md)                            | 按下活动栏图标，可在在侧边栏显示指定面板 |
| UI.[设置页](./3-settings.md)                           | 在设置页配置插件                         |
| [多语言](./3-locales.md)                               | 从 JSON 加载用于 UI 的字符串             |



#### 兼容层

为了兼容 Windows/Linux（提供 Node.js） 和 macOS（不提供 Node.js） 版本的 Typora，模块 [`@typora-community-plugin/core`][^core] 提供了跨平台版本的 Node.js 模块 `fs` 和 `path`。

```js
import { fs, path } from "@typora-community-plugin/core"
```



[^core]: https://www.npmjs.com/package/@typora-community-plugin/core
