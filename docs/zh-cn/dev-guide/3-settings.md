# 设置

在设置页配置插件，并将配置持久化到配置文件。

快捷键不需要自行添加设置界面，统一在「设置 > 快捷键」中配置。



## 存储

使用 `PluginSettings` 管理插件配置。它继承自 `Settings`，提供读取、写入、变更监听与自动保存。

### 创建与注册

在 `onload()` 中调用 `registerSettings()`：

```ts
import { Plugin, PluginSettings } from '@typora-community-plugin/core'

type MySettings = {
  enabled: boolean
  theme: 'light' | 'dark' | 'auto'
  network: {
    timeout: number
  }
}

export default class extends Plugin {
  onload() {
    this.registerSettings(new PluginSettings<MySettings>(this.app, this.manifest, {
      version: 1,
    }))
  }
}
```

构造签名：

```ts
new PluginSettings(app, manifest, {
  version: number,
})
```

设置文件固定为 `data/<manifest.id>`，无需（也不能）自行指定 `filename`。

> **注意**：`Plugin.settings` 是 getter。未调用 `registerSettings()` 就访问 `this.settings` 会直接抛错。



### 读写配置

通过 `settings.get()` 读取，`settings.set()` 写入。两者都支持嵌套路径：

```ts
// 读取
const theme = this.settings.get('theme')                  // 'light'（已设置默认值时）
const timeout = this.settings.get(['network', 'timeout']) // 30

// 写入（自动触发持久化）
this.settings.set('theme', 'dark')
this.settings.set(['network', 'timeout'], 60)
```

> **注意**：`set()` 在值相等时不会触发变更，也不会保存。直接写入同一个对象引用也不会触发；需要修改嵌套字段时请使用嵌套路径，或写入一个新对象。



### 默认值

可以在注册后设置默认值：

```ts
this.registerSettings(new PluginSettings<MySettings>(this.app, this.manifest, { version: 1 }))
this.settings.setDefault({
  enabled: true,
  theme: 'auto',
  network: { timeout: 30 },
})
```

读取时缺失的键会取到默认值。



### 监听变更

使用 `onChange()` 监听特定键或所有键：

```ts
// 监听单个键
const dispose = this.settings.onChange('theme', (key, value) => {
  console.log(`${key} 变为 ${value}`)
})

// 监听嵌套路径
this.settings.onChange(['network', 'timeout'], (key, value) => {
  // ...
})

// 监听所有键
this.settings.onChange('*', (key, value) => {
  // ...
})

// 取消监听
dispose()
```



### 持久化机制

- **存储位置**：`<configDir>/data/<pluginId>.json`
  - 默认使用全局配置目录：`<Typora userData>/plugins/settings`；
  - 如果当前笔记文件夹下存在 `.typora/`，则自动切换到仓库级配置 `<vault>/.typora`。
- **文件格式**：

  ```json
  {
    "version": 1,
    "settings": {
      "enabled": true,
      "theme": "auto"
    }
  }
  ```

- **自动保存**：每次 `set()` 后触发防抖保存（1 秒延迟），无需手动调用 `save()`。
- **路径**：`this.dataPath` 返回的就是这个设置文件的完整路径。



### 版本字段

`version` 表示设置文件结构版本。当前 core 会把它写入文件并在加载时读回，但用于自动迁移的 `SettingMigrations` 尚未从包入口导出，因此第三方插件暂时无法使用迁移能力。

> 修改设置结构时，请自行兼容旧字段，或在读取后做一次性转换。



## 界面

设置界面的创建方式详见[设置界面](./3-settings-ui.md)。



## 例子

- [typora-plugin-codeblock-highlight-mapper](https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper)
- [typora-plugin-file-icon](https://github.com/typora-community-plugin/typora-plugin-file-icon)
- [typora-plugin-front-matter](https://github.com/typora-community-plugin/typora-plugin-front-matter)
- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets)
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink)
