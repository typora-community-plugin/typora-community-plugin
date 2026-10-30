# 命令

默认使用快捷键 <kbd>F1</kbd> 可以打开命令面板。



## 注册命令

在插件实现类的 `onload()` 方法中使用 `registerCommand()` 注册命令：

```ts
import { Plugin } from '@typora-community-plugin/core'

export default class extends Plugin {
  onload() {
    this.registerCommand({
      id: 'fold-all',
      title: '折叠所有',
      scope: 'editor',
      hotkey: 'Alt+Ctrl+T',
      callback: () => {
        // 实现命令功能
      },
    })
  }
}
```

注册的命令会在插件卸载时自动移除。



## Command

```ts
type Command = {
  id: string
  title: string
  scope: 'global' | 'editor'
  hotkey?: string | null
  /** @default true */
  showInCommandPanel?: boolean
  /** 必须支持不传任何参数 */
  callback: (...args: any[]) => void
}
```

| 字段 | 说明 |
| --- | --- |
| `id` | 命令 id。注册后实际 id 会变为 `<manifest.id>:<command.id>`。 |
| `title` | 命令标题。注册后实际标题会变为 `<manifest.name>: <command.title>`。 |
| `scope` | `global` 在整个窗口绑定热键；`editor` 只在编辑器区域绑定热键。 |
| `hotkey` | 可选快捷键，如 `Alt+Ctrl+T`。会被归一化后绑定，详见[快捷键](./3-hotkey.md)。 |
| `showInCommandPanel` | 是否显示在命令面板中，默认 `true`。设为 `false` 后仍可通过 `app.commands.run()` 或快捷键触发。 |
| `callback` | 命令执行函数。命令面板可能不传参数调用，因此不要依赖必需参数。 |

> **注意**：`registerCommand()` 的返回值是 `void`。卸载时自动移除由 `this.register()` 完成，不需要手动解绑。



## 运行命令

插件注册的命令必须使用带前缀的完整 id：

```ts
this.app.commands.run(`${this.manifest.id}:fold-all`)
```

核心内置命令直接使用原名，例如：

```ts
this.app.commands.run('settings:open')
this.app.commands.run('core.workspace:split-right')
```



## CommandManager

通过 `app.commands` 访问：

| 方法 | 说明 |
| --- | --- |
| `register(command)` | 注册命令，返回注销函数。插件中通常使用 `this.registerCommand()`。 |
| `unregister(command)` | 注销命令。 |
| `run(commandId, args?)` | 运行命令；不存在时不执行任何操作，回调抛错时记录日志。 |
| `getRecentCommandIds()` | 获取最近执行的命令 id（最多 5 个）。 |
| `setCommandHotkey(commandId, hotkey)` | 修改命令快捷键并持久化；传 `null` 可取消。 |
| `resetCommandHotkey(commandId)` | 恢复为插件注册时的默认快捷键。 |

命令快捷键保存在配置目录的 `hotkeys.json` 中，用户在「设置 > 快捷键」中的修改会在下次启动时读取。



## 例子

- [typora-plugin-collapsible-section](https://github.com/typora-community-plugin/typora-plugin-collapsible-section)
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
