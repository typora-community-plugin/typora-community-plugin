# I18n

You can switch the display language of plugin UI in "Settings > About". Core currently ships with English (`en`), Simplified Chinese (`zh-cn`), and German (`de`).



## Configuration

### Loading from Code

Write the strings directly in a code file and instantiate `I18n` with `resources`. Suitable for languages with little text.

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

> `i18n` is a field declared by the plugin itself; the `Plugin` base class has no built-in `i18n`.



### Loading from JSON

```ts
import { I18n, Plugin, path } from '@typora-community-plugin/core'
import type * as Locale from './locales/lang.en.json'

export default class extends Plugin {

  i18n = new I18n<typeof Locale>({
    localePath: path.join(this.manifest.dir!, 'locales'),
  })
}
```

> `import type` only gives `t` key-name hints; the JSON is not bundled into the output.

The `locales` directory structure:

```
locales
├── lang.en.json
└── lang.zh-cn.json
```

File `lang.en.json`:

```json
{
  "foldAll": "Fold all",
  "unfoldAll": "Unfold all"
}
```

File `lang.zh-cn.json`:

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

| Option | Description |
| --- | --- |
| `resources` | A string object keyed by language code. |
| `localePath` | Directory containing locale files, read as `lang.<locale>.json`. |
| `defaultLang` | Fallback language, defaults to `en`. |
| `userLang` | Force a language; when omitted, Typora's UI language is used. |

Language resolution order:

1. `userLang`;
2. Typora's `appLocale` / `locale`;
3. Lowercase the language code and try `zh-cn` → `zh` → `defaultLang` in turn.

| Member | Description |
| --- | --- |
| `locale` | The language code actually matched. In `resources` mode it is `''` when nothing matches. |
| `t` | The string object for the current language (read-only). |

> **Notes**:
>
> - In `resources` mode, if no language matches, `t` is `undefined`. Make sure to always provide resources for the `defaultLang`.
> - In file mode, if all candidate files fail to load, `No locale file found.` is thrown.
> - I18n has no runtime switching API. After changing the language in "Settings > About", existing `I18n` instances do not update automatically; you usually need to reload the plugin or restart Typora.



## Usage

Reference the plugin instance's `i18n` member:

```ts
this.registerCommand({
  id: 'fold-all',
  title: this.i18n.t.foldAll,
  scope: 'editor',
  callback: () => foldAll('', true),
})
```

You can also access `this.i18n.t.xxx` directly in the page; its type is inferred from `resources` or the JSON imported with `import type`.



## Examples

- [typora-plugin-collapsible-section](https://github.com/typora-community-plugin/typora-plugin-collapsible-section)
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
