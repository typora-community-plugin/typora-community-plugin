# Feature Changelog

## v2.5.3

- feat(core/ui/layout/tabs): seperate deactive/opened/actived tab
- fix(core/ui/layout/views/markdown): can not open NewTab after closed the only one tab
- fix(core/ui/layout): lost activeLeaf after split view

## v2.5.1

- fix(core/ui/views/markdown): can not open file correctly

## v2.5.0

- feat(core/ui/layout): Add **Workspace API**, supports SplitView

## v2.4.1

- feat(core/export-manager): Support using **Export API** to modify the exported HTML.
- chore(core/net): Display more explicit error messages for network requests.

- **Plugin Update**
  - [templater][]: Template directory supports absolute paths
  - [wavedrom][]: Render graphics to the exported HTML

## v2.3.41

- fix(core/ui/components/menu): menu item can not be shown when clicking on whitespace in file explorer
- fix(core/ui/components/menu): submenu position is not correctly if a divider is in front of it

## v2.3.39

- feat(core/ui/components/menu): support internal contextmenu
- feat(core/ui/worlspace): support custom `file-menu`
- feat(core/ui/components/menu): support submenu

## v2.3.36

- feat(installer): support user installed Typora
- feat(common/events): add `getEventNames()` for plugin-trigger

- **New Plugin**
  - [trigger][]: Set a trigger for the command to execute automatically.

- **Plugin Update**
  - [markmap][]: custom options
  - [front-matter][]: Focused Time

## v2.3.34

- fix: can not install plugin from marketplace on macOS

## v2.3.33

- **New Plugin**
  - [templater][]: 
    - feat: create notes from templates
    - fix: can not handle Front Matter
    - fix: can not merge Front Matter when pasting content from template

- **Plugin Update**
  - [code-folding][]:
    - fix: can not fold code on linux
    - fix: can not fold ruby & sql
  - [collapsible-section][]
    - feat: fold/unfold h1~h6 & plain quoteblock by command

## v2.3.32

- feat(core/ui/quick-open): support input-box & quick-pick like vscode
- fix(core/ui/ribbon): can not open app settings on macOS ([#36](https://github.com/typora-community-plugin/typora-community-plugin/issues/36))

## v2.3.30

- fix(core/ui/component/notice): can not setCloseable before setMessage
- fix(core/ui/editor/string-mask): can not handle `<direct-link>`

## v2.3.28

- feat(core/ui/components): closeable notice
- feat(core/ui/editor/suggest): support custom suggest type
- feat(core/ui/editor/suggest): support triggering suggestions in the inline syntax
- refactor(core/ui/editor): expose api to get/set md

- **Plugin Update**
  - [footnotes][]: 
    - feat: footnote marker suggestion
    - fix: wrong order of re-indexing footnotes

## v2.3.24

- fix(core/ui/editor/html-mask): can not parse arrow `<-`
- fix(core/ui/editor/html-mask): can not parse not-tag text like `<a\n`

- **New Plugin**
  - [footnotes][]: Re-index the numerical footnotes.

## v2.3.22

- fix(core/ui/tabs): throws error when event 'file:delete' emited
- fix(core/ui/tabs): can not rename tab

- **Plugin Update**
  - [collapsible-section][]
    - feat: collapsible codeblock
    - feat: collapsible callout
  - [image-viewer][]
    - feat: click the image wrapped in html to preview the image
  - [wikilink][]
    - fix: not cache all file path
    - fix: file cache emit too much event after switched folder
    - fix: can not use suggestion

## v2.3.20

- fix(core/ui/settings/tabs/marketplace): throw error if `app.plugin.marketplace` loading slowly on macOS

## v2.3.19

- fix(core/ui/ribbon): lost active status when clicked settings buton
- fix(core/ui/ribbon): throw error when hide ribbon
- fix(core/ui/sidebar): no active any ribbon after lauched Typora

## v2.3.16

- fix(core/ui/ribbon): can not show ribbon after hided it
- fix(core/ui/sidebar): when sidebar is hidden, we can not show it by clicking the non-active ribbon button
- refactor(core/ui/components/editable-table): new style of editing row

## v2.3.13

- ~~fix(core/ui/ribbon): can not show ribbon after hided it~~
- fix(core/ui/editor/link): add `.md` if filepath has extension

## v2.3.11

- feat(croe/ui/editor): support markdown path without extension

## v2.3.10

- refactor(core/plugin): expose new API to register MarkdownEditor events & sugguest

## v2.3.9

- fix(core/app): can not open link with chinese
- fix(core/app): can not open non-absolute path without prefix `.`
- fix(core/app): can not open link wrapped with `<>`

## v2.3.6

- fix(core/ui/tab/plugin-manager): can not refresh list atfer uninstall & reinstall plugin
- fix(core/app): can not open link with anchor

## v2.3.4

- fix(core/ui/components/tabs): can not "close other tabs" & "close right tabs"

## v2.3.3

- fix(core/io/config): can not switch from global settings to vault settings

## v2.3.2

- refactor(core/ui): decouple controllors from ui views
- fix(core/io/config): can not load global settings if it has not vault settings
- chore(core,loader): set `loader.json`'s `debug` property to `true`, so that we can print logs for debugging

- **New Plugin**
  - [wavedrom][]: Use Wavedrom in codeblock

## v2.2.22

- fix(core/io/config): can not load i18n correctly

## v2.2.21

- fix(core/ui): layout problem on Windows/Linux from v2.2.20

## v2.2.20

- fix(core/ui): layout problem on macOS

## v2.2.19

- refactor(core/ui/settings): settings modal header shows it is gloabl or vault
- fix(core/io/config): can switch to current settings in command panel

## v2.2.17

- fix(core/commands): can not unbind hotkey
- fix(core/ui/tabs): lost tab after renamed file

## v2.2.15

- fix(core/ui/tabs): having gap in fullscreen on macOS
- fix(core/ui/commands): can not show all commands if too many commands

## v2.2.13

- fix(core/ui/settings): border disapear when fullscreen
- ~~fix(core/ui/tabs): having gap in fullscreen on macOS~~

## v2.2.11

- fix(core/io/vault): can not handle file change event on macOS
- fix(core/ui/tabs): having gap between header and tabs on macOS
- refactor(core/ui): unify indicator's width (active ribbon, active file, active tab)

## v2.2.8

- pref(core): speed up in macOS
- refactor(core/ui/ribbon): icon's stroke lighter

## v2.2.6

- fix(core): can not run in macOS

## v2.2.5

- fix(core/commands): show useless command "Open command panel" in command panel
- fix(core/ui/components/menu): width is not enough in English

- **Plugin Update**
  - [note-snippets][]
    - fix: can not load snippets form global settings

## v2.2.3

- fix(core/io/config): can not save global settings

## v2.2.2

- feat(core/io/config): support global settings

- **BREAKING CHANGE**
  - refactor(core/io/vault): remove `vault.readConfigJson()` and `vault.writeConfigJson()`

- **Plugin Update**
  - [collapsible-section][]
    - feat: can disable automatic codeblock folding when manual folding is supported
    - feat: automatically fold codeblock only when the number of code lines exceeds the limit

## v2.1.4

- fix(core/command/manager): failed to unregister command

## v2.1.3

- fix(core/command/manager): after changed vault, not reset user's hotkey
- fix(core/settings): listener failed will stop other listeners and setting's save
- fix(core/ui/components): save settings useless when mouse up
- fix(core/ui/quick-open-panel): miss registering event listener disposer

- **New Plugin**
  - [image-viewer][]: View all the images in the current Markdown.

- **Plugin Update**
  - [drakmode][]
    - fix: revert color of multi-media
    - fix: not compatible with plugin-image-viewer
  - [front-matter][]
    - feat: can disable adding prop `created` or `updated`
    - feat: can add property's names automatically
  - [image-location][]
    - feat: Resolve Front Matter `typora-root-url` relative to the vault's root
    - feat: Image Upload Command supports instruction `${vault}`
    - feat: Simplify the image's absolute path to relative path from vault root

## v2.0.20

- fix(core/locales/i18n): can not try to load next locale file if first locale file failed to load

## v2.0.19

- fix(core/plugin/manager): switch folder will change enabled plugins settings
- fix(core/ui/sidebar/search): `openGlobalSearch()` can not active ribbon

- **Plugin Update**
  - [codeblock-highlight-mapper][]: speed up non-mapped codeblock render

## v2.0.17

- fix(core/ui/sidebar): can not disable showing unsupported files

- **Plugin Update**
  - [tag][]: In tag panel, click tag's search button can jump to search panel and search it.

## v2.0.15

- fix(core/ui/sidebar): drop file will open it unexpectedly

## v2.0.14

- fix(core/ui/sidebar): file tree can not show unspported files in sometime

- **Plugin Update**
  - [collapsible-section][]
    - feat(codeblock): support using fold/unfold all codeblocks from command panel
    - fix(codeblock): After unfolding all, then scroll down. Some codeblock is still folded.
    - fix(codeblock): create a new codeblock will fold it

## v2.0.13

- feat(core/ui/ribbon): active ribbon button after click
- fix(core/ui/sidebar): can not click same button to toggle sidebar
- fix(core/component/draggable): can drag el with middle/right mouse button
- fix(core/ui/tabs): can not switch tab when click the file extension
- fix(core/ui/editor): creating new line or changing text style can not emit 'edit' event

- **New Plugin**
  - [code-folding][]: Make your codes foldable.
  - [image-location][]: Resolve image's location relative to vault's root.

- **Plugin Update**
  - [codeblock-highlight-mapper][]: Re-implements plugin so that it will not modfiy markdown
  - [collapsible-section][]: collapsible table
  - [drakmode][]: status bar button

## v2.0.8

- feat(core/plugin): support api to add status bar item
- feat(core/ui/tabs): support hide file extension of file tab
- feat(core/ui/tabs): click file tab with middle mouse button to close tab
- feat(core/ui/tabs): close active tab with contextmenu

- **New Plugin**
  - [drakmode][]: Dark Mode

## v2.0.4

- **New Plugin**
  - [abcjs][]: ABC Music Notation

## v2.0.0

- feat(core/ui/siderbar/search): keep search results

## v2.0.0-beta.37

- feat(core/ui/tabs): limit max-width of tab
- feat(core/ui/tabs): close current tab will open sibling tab (#5)

## v2.0.0-beta.36

- feat(core/net): reset github proxy when it removed

## v2.0.0-beta.33

- enhance compoatibility with macOS

## v2.0.0-beta.26

- feat(core/setting/tab/plugin-manager): show progress of checking for updates

## v2.0.0-beta.24

- feat(core/plugin): check all plugins for update
- feat(core/settings/tab/plugin-marketplace): reload plugin list button

## v2.0.0-beta.22

- feat(core/ui/ribbon): support drag to re-order button
- feat(core/ui/ribbon): suport show/hide button

## v2.0.0-beta.19

- feat(core/settings): setting migration

## v2.0.0-beta.15

- feat(core/plugin): update plugin

## v2.0.0-beta.14

- feat(core/plugin): not enable plugin which need higher core's version

## v2.0.0-beta.11

- feat(core/settings/tab/plugin): search plugins
- feat(core/settings/tab/about): custom display language
- feat(core/settings/tab/about): update `core` in about setting tab

## v2.0.0-beta.10

- feat(core/ui/quick-open-panel): open file in current window
- feat(core): ignore file

## v2.0.0-beta.9

- feat(core/component/notice): add notice

## v2.0.0-beta.7

- feat(core/ui/sidebar/file-explorer): show not supported file
- feat(core/ui/editor): open markdown link in current window
- feat(core/settings/tab/plugin-manager): show how many plugins installed
- feat(core/ui/sidebar/search): show search result full path

## v2.0.0-beta.6

- feat(core/plugin/marketplace): add github proxy `ghproxy`

## v2.0.0-beta.5

- feat(core/plugin): support uninstall plugin



[abcjs]: https://github.com/typora-community-plugin/typora-plugin-abcjs

[codeblock-highlight-mapper]: https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper

[collapsible-section]: https://github.com/typora-community-plugin/typora-plugin-collapsible-section

[code-folding]: https://github.com/typora-community-plugin/typora-plugin-code-folding

[drakmode]: https://github.com/typora-community-plugin/typora-plugin-darkmode

[footnotes]: https://github.com/typora-community-plugin/typora-plugin-footnotes

[front-matter]: https://github.com/typora-community-plugin/typora-plugin-front-matter

[image-location]: https://github.com/typora-community-plugin/typora-plugin-image-location

[image-viewer]: https://github.com/typora-community-plugin/typora-plugin-image-viewer

[markmap]: https://github.com/typora-community-plugin/typora-plugin-markmap

[note-snippets]: https://github.com/typora-community-plugin/typora-plugin-note-snippets

[tag]: https://github.com/typora-community-plugin/typora-plugin-tag

[templater]: https://github.com/typora-community-plugin/typora-plugin-templater

[trigger]: https://github.com/typora-community-plugin/typora-plugin-trigger

[wavedrom]: https://github.com/typora-community-plugin/typora-plugin-wavedrom

[wikilink]: https://github.com/typora-community-plugin/typora-plugin-wikilink
