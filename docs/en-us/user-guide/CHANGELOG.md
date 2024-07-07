# Feature Changelog

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

[image-location]: https://github.com/typora-community-plugin/typora-plugin-image-location

[tag]: https://github.com/typora-community-plugin/typora-plugin-tag
