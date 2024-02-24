# 多语言

可以在“配置”-“关于”中切换插件的显示语言。



## 配置

### 从代码中加载

直接写入代码文件，使用配置 `resources` 实例化 `I18n` 类。适合文本量少的语言文本。

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



### 从 JSON 加载

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

`src/locales` 的目录结构：

```
src/locales
├── lang.en.json
└── lang.zh-cn.json
```

> 下面改写 typora-plugin-collapsible-section 的语言文本到 JSON 文件中作为例子

文件 `lang.en.json`：

```json
{
  "foldAll": "Fold all",
  "unfoldAll": "Unfold all",
  "foldAllHeadings": "Fold all headings",
  "unfoldAllHeadings": "Unfold all headings"
}
```

文件 `lang.zh-cn.json`：

```json
{
  "foldAll": "折叠所有",
  "unfoldAll": "展开所有",
  "foldAllHeadings": "折叠所有标题",
  "unfoldAllHeadings": "展开所有标题"
}
```



## 使用

引用 Plugin 实例的 i18n 成员

```diff
  // typora-plugin-collapsible-section /src/main.ts

  this.registerCommand({
    id: 'fold-all',
+   title: this.i18n.t.foldAll,
    scope: 'editor',
    callback: () => foldAll('', true),
  })
```

