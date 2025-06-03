# Multilingual

You can switch the display language of the plugin in "Settings" - "About".

## Configuration

### Load from Code

Directly write into the code file, using the configuration `resources` to instantiate the `I18n` class. Suitable for a small amount of text in a language.

```ts
// typora-plugin-collapsible-section /src/main.ts

export default class extends Plugin {

  i18n = new I18n({
    resources: {
      'en': {
        foldAll: 'Fold all',
        unfoldAll: 'Unfold all',
        foldAllHeadings: 'Fold all headings',
        unfoldAllHeadings: 'Unfold all headings',
      },
      'zh-cn': {
        foldAll: '折叠所有',
        unfoldAll: '展开所有',
        foldAllHeadings: '折叠所有标题',
        unfoldAllHeadings: '展开所有标题',
      },
    }
  })
  
  // ...
}
```

### Load from JSON

```ts
import { path } from "@typora-community-plugin/core"
import * as Locale from 'src/locales/lang.en.json'

export default class extends Plugin {

  i18n = new I18n<typeof Locale>({
    localePath: path.join(this.manifest.dir!, 'locales'),
  })
  
  // ...
}
```

Directory structure of `src/locales`:

```
src/locales
├── lang.en.json
└── lang.zh-cn.json
```

> Below is an example of rewriting the language text of typora-plugin-collapsible-section into JSON files.

File `lang.en.json`:

```json
{
  "foldAll": "Fold all",
  "unfoldAll": "Unfold all",
  "foldAllHeadings": "Fold all headings",
  "unfoldAllHeadings": "Unfold all headings"
}
```

File `lang.zh-cn.json`:

```json
{
  "foldAll": "折叠所有",
  "unfoldAll": "展开所有",
  "foldAllHeadings": "折叠所有标题",
  "unfoldAllHeadings": "展开所有标题"
}
```

## Usage

Reference the i18n member of the Plugin instance.

```diff
  // typora-plugin-collapsible-section /src/main.ts

  this.registerCommand({
    id: 'fold-all',
+   title: this.i18n.t.foldAll,
    scope: 'editor',
    callback: () => foldAll('', true),
  })
```
