# 多语言

可以在「设置 > 关于」中切换插件界面的显示语言。core 目前内置英语（`en`）、简体中文（`zh-cn`）和德语（`de`）。



## 配置

### 从代码中加载

直接写入代码文件，使用 `resources` 实例化 `I18n`。适合文本量少的语言文本。

```ts
import { I18n, Plugin } from '@typora-community-plugin/core'

export default class extends Plugin {

  i18n = new I18n({
    resources: {
      en: {
        foldAll: 'Fold all',
        unfoldAll: 'Unfold all',
      },
      'zh-cn': {
        foldAll: '折叠所有',
        unfoldAll: '展开所有',
      },
    },
  })

  onload() {
    this.registerCommand({
      id: 'fold-all',
      title: this.i18n.t.foldAll,
      scope: 'editor',
      callback: () => { /* ... */ },
    })
  }
}
```

> `i18n` 是插件自己声明的字段，`Plugin` 基类没有内置 `i18n`。



### 从 JSON 加载

```ts
import { I18n, Plugin, path } from '@typora-community-plugin/core'
import type * as Locale from './locales/lang.en.json'

export default class extends Plugin {

  i18n = new I18n<typeof Locale>({
    localePath: path.join(this.manifest.dir!, 'locales'),
  })
}
```

> `import type` 只用于让 `t` 获得键名提示，不会把 JSON 打进产物。

`locales` 目录结构：

```
locales
├── lang.en.json
└── lang.zh-cn.json
```

文件 `lang.en.json`：

```json
{
  "foldAll": "Fold all",
  "unfoldAll": "Unfold all"
}
```

文件 `lang.zh-cn.json`：

```json
{
  "foldAll": "折叠所有",
  "unfoldAll": "展开所有"
}
```



## I18n

```ts
type I18nOptions<T> =
  | { localePath: string, defaultLang?: string, userLang?: string }
  | { resources: Record<string, T>, defaultLang?: string, userLang?: string }
```

| 选项 | 说明 |
| --- | --- |
| `resources` | 以语言代码为键的文案对象。 |
| `localePath` | 语言文件所在目录，按 `lang.<locale>.json` 读取。 |
| `defaultLang` | 回退语言，默认 `en`。 |
| `userLang` | 强制指定语言；不传时读取 Typora 的界面语言。 |

语言解析顺序：

1. `userLang`；
2. Typora 的 `appLocale` / `locale`；
3. 语言代码小写后依次尝试 `zh-cn` → `zh` → `defaultLang`。

| 成员 | 说明 |
| --- | --- |
| `locale` | 实际匹配到的语言代码。`resources` 模式无匹配时为 `''`。 |
| `t` | 当前语言的文案对象（只读）。 |

> **注意**：
>
> - `resources` 模式没有匹配到任何语言时，`t` 会是 `undefined`，使用时请确保至少提供 `defaultLang` 对应的资源。
> - 文件模式下所有候选文件都读取失败会抛错 `No locale file found.`。
> - I18n 没有运行时切换 API。修改「设置 > 关于」中的语言后，已创建的 `I18n` 实例不会自动更新，通常需要重新加载插件或重启 Typora。



## 使用

引用插件实例的 `i18n` 成员：

```ts
this.registerCommand({
  id: 'fold-all',
  title: this.i18n.t.foldAll,
  scope: 'editor',
  callback: () => foldAll('', true),
})
```

页面内也可以直接访问 `this.i18n.t.xxx`，类型会由 `resources` 或 `import type` 的 JSON 推导。



## 例子

- [typora-plugin-collapsible-section](https://github.com/typora-community-plugin/typora-plugin-collapsible-section)
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
