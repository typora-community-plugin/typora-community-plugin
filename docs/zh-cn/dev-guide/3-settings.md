# 设置

在设置页配置插件，持久化用于配置到配置文件。

快捷键不需要自行添加设置界面，统一在 "设置" > "快捷键" 设置。



## 存储

使用 Plugin 的 `registerSettings()` 注册 `PluginSettings` 实例。

然后可以通过 Plugin 的 `settings` 自动访问 `PluginSettings` 实例。


### 创建与注册

```typescript
import { Plugin, PluginSettings } from '@typora-community-plugin/core'

export class MyPlugin extends Plugin {
  registerSettings() {
    this.registerSettings(new PluginSettings(this.app, this.manifest, {
      version: 1,
    }))
  }
}
```


### 读写配置

通过 `settings.get()` 读取，`settings.set()` 写入。

```typescript
// 读取（支持嵌套路径）
const theme = this.settings.get('theme')        // 'light'
const timeout = this.settings.get(['network', 'timeout'])  // 30

// 写入（自动触发持久化）
this.settings.set('theme', 'dark')
this.settings.set(['network', 'timeout'], 60)
```


### 监听变更

使用 `onChange()` 或 `addChangeListener()` 监听特定键或所有键的变化。

```typescript
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

- **存储位置**：`<configDir>/data/<pluginId>.json`（`<configDir>` 为全局配置目录或仓库级 `.typora/`）
- **文件格式**：JSON，包含 `version` 和 `settings` 两层结构
- **自动保存**：每次 `set()` 调用后触发防抖保存（1 秒延迟），无需手动调用


### 版本迁移

当配置结构发生破坏性变更时，递增 `version` 并使用 `SettingMigrations` 进行数据迁移。

```typescript
import { Plugin, PluginSettings, SettingMigrations } from '@typora-community-plugin/core'

const migrations = new SettingMigrations()
  .addMigration(1, 2, (old) => ({
    theme: old.settings.theme === 'dark' ? 'night' : 'day',
    apiKey: old.settings.apiKey,
  }))

export class MyPlugin extends Plugin {
  registerSettings() {
    this.registerSettings(new PluginSettings(this.app, this.manifest, {
      version: 2,
      migrations,
    }))
  }
}
```


## 界面

详见 [3-settings-ui](./3-settings-ui)。


## 例子

- [typora-plugin-codeblock-highlight-mapper](https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper)
- [typora-plugin-file-icon](https://github.com/typora-community-plugin/typora-plugin-file-icon)
- [typora-plugin-front-matter](https://github.com/typora-community-plugin/typora-plugin-front-matter)
- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets)
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink)