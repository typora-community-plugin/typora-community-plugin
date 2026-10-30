# 快捷键

快捷键通过命令注册，不单独维护一套绑定 API。用户在「设置 > 快捷键」中也可以修改或重置快捷键。



## 注册

在 `registerCommand()` 中填写 `hotkey` 和 `scope`：

```ts
import { Plugin } from '@typora-community-plugin/core'

export default class extends Plugin {
  onload() {
    this.registerCommand({
      id: 'toggle-style',
      title: '切换标签样式',
      scope: 'editor',
      hotkey: 'Alt+Ctrl+T',
      callback: () => this.toggleTagStyle(),
    })
  }

  toggleTagStyle() {
    // ...
  }
}
```

注册的快捷键会在插件卸载时自动移除。



## scope

| 值 | 绑定位置 | 适用场景 |
| --- | --- | --- |
| `global` | 整个窗口 | 打开设置、切换面板等全局命令。 |
| `editor` | 编辑器区域 | 编辑文本、格式化选区等命令。 |

`editor` 作用域的快捷键只在编辑器获得焦点时触发，避免与 Typora 或系统快捷键冲突。



## 快捷键格式

- 使用 `+` 连接修饰键与按键，例如 `Ctrl+Shift+P`、`Alt+Ctrl+T`。
- 修饰键别名会被归一化：
  - `cmd` / `command` / `win` → `meta`
  - `ctrl` / `control` → `ctrl`
  - `opt` / `option` → `alt`
- 不区分大小写，最终按键顺序会被排序后绑定。
- 方向键会显示为 `↑`、`↓`、`←`、`→`。

例如 `Alt+Ctrl+T` 与 `ctrl+alt+t` 等价。



## 显示快捷键

core 内部使用 `readableHotkey()` 把归一化后的快捷键转换为可读文本（macOS 显示 `Cmd`，其他平台显示 `Win`）。

> `readableHotkey()` 目前未从包入口导出。需要在界面中展示快捷键时，可参考它的格式自行转换：修饰键首字母大写，macOS 用 `Cmd`、其他平台用 `Win` 代替 `meta`。



## 用户修改快捷键

如果命令设置了 `hotkey`，它会出现在「设置 > 快捷键」中，用户可以：

- 搜索并修改按键；
- 重置为插件注册时的默认值。

插件不需要自己实现快捷键设置界面。修改结果保存在配置目录的 `hotkeys.json` 中。



## 与命令面板的关系

`showInCommandPanel: false` 只影响命令是否出现在命令面板，不影响快捷键绑定。需要“只提供快捷键、不在命令面板显示”的命令时，可以这样写：

```ts
this.registerCommand({
  id: 'quick-toggle',
  title: '快速切换',
  scope: 'editor',
  hotkey: 'Ctrl+Alt+Q',
  showInCommandPanel: false,
  callback: () => { /* ... */ },
})
```



## 例子

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-collapsible-section](https://github.com/typora-community-plugin/typora-plugin-collapsible-section)
