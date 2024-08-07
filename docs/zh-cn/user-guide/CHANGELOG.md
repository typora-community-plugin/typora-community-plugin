# 特性更新日志

## What's Next

- fix(core/ui/components): 修复抬起鼠标时，会触发保存设置的问题

- **新增插件**
  - [image-viewer][]: 查看当前文档所有图片。

- **插件更新**
  - [drakmode][]
    - fix: 反转了多媒体颜色的问题
    - fix: 不兼容 [image-viewer][] 的问题
  - [front-matter][]
    - feat: 禁用自动插入 `created` 或 `updated`
    - feat: 为新笔记自动插入指定字段名
  - [image-location][]
    - feat: 相对于当前笔记目录的根目录解析 Front Matter 属性 `typora-root-url`
    - feat: 图片上传命令，支持占位符 `${vault}`（它会被解析为当前笔记目录的根路径）
    - feat: 插入图片时，简化图片绝对路径为相对于 当前笔记目录的根目录 的相对路径

## v2.0.20

- fix(core/locales/i18n): 修复在加载失败后不能再次尝试加载下一个语言文件的问题

## v2.0.19

- fix(core/plugin/manager): 切换笔记目录会修改插件启用状态
- fix(core/ui/sidebar/search): `openGlobalSearch()` 不能激活 Ribbon 按钮

- **插件更新**
  - [codeblock-highlight-mapper][]: 加快没有映射的代码块的渲染速度

## v2.0.17

- fix(core/ui/sidebar): 启用“显示不支持的文件”后不能禁用

- **插件更新**
  - [tag][]: 在插件面板中点击搜索按钮，跳转到搜索面板搜索该标签

## v2.0.15

- fix(core/ui/sidebar): 拖放文件会意外地使用 Typora 打开它

## v2.0.14

- fix(core/ui/sidebar): 修复文件树有时不能显示不支持的文件的问题

- **插件更新**
  - [collapsible-section][]
    - 支持通过命令面板折叠/展开所有代码块
    - 修复展开所有代码块后，新展示的代码块仍然折叠的问题
    - 修复新增的代码块会被折叠的问题

## v2.0.13

- feat(core/ui/ribbon): 点击 Ribbon 时高亮
- fix(core/ui/sidebar): 修复点击同一个 Ribbon 按钮时，不能折叠/展开侧栏的问题
- fix(core/component/draggable): 修复可以使用非左键拖动 Ribbon 的问题
- fix(core/ui/tabs): 修复点击到 Tab 的文件扩展名时，不能切换 Tab 的问题
- fix(core/ui/editor): 修复创建新行不触发 edit 事件的问题

- **新增插件**
  - [code-folding][]: 代码折叠
  - [image-location][]: 相对于当前笔记目录的根目录解析图片路径

- **插件更新**
  - [codeblock-highlight-mapper][]: 改变实现方式，不需要修改 Markdown 就可以实现高亮
  - [collapsible-section][]: 支持折叠表格
  - [drakmode][]: 添加状态栏按钮

## v2.0.8

- feat(core/plugin): 提供 API 来支持添加状态栏按钮
- feat(core/ui/tabs): 支持隐藏文件扩展名
- feat(core/ui/tabs): 中键点击文件标签可以关闭标签
- feat(core/ui/tabs): 使用右键菜单关闭当前标签

- **新增插件**
  - [drakmode][]: 暗黑模式

## v2.0.4

- **新增插件**
  - [abcjs][]: ABC记谱法

## v2.0.0

- feat(core/ui/siderbar/search): 保留搜索面板的搜索结果

## v2.0.0-beta.37

- feat(core/ui/tabs): 限制文件标签的最大宽度
- feat(core/ui/tabs): 支持关闭当前文件标签，然后自动打开相邻标签 (#5)

## v2.0.0-beta.36

- feat(core/net): Github 代理被移除后，自动重置

## v2.0.0-beta.33

- 增强对 macOS 的兼容性

## v2.0.0-beta.26

- feat(core/setting/tab/plugin-manager): 显示检查所有插件更新的进度

## v2.0.0-beta.24

- feat(core/plugin): 检查所有插件更新
- feat(core/settings/tab/plugin-marketplace): 插件市场新增刷新插件列表的按钮

## v2.0.0-beta.22

- feat(core/ui/ribbon): 活动栏按钮支持拖动
- feat(core/ui/ribbon): 活动栏按钮支持显示/隐藏

## v2.0.0-beta.19

- feat(core/settings): 配置迁移

## v2.0.0-beta.15

- feat(core/plugin): 支持更新插件

## v2.0.0-beta.14

- feat(core/plugin): 如果 core 版本过低，不启用插件

## v2.0.0-beta.11

- feat(core/settings/tab/plugin): 插件列表中搜索插件
- feat(core/settings/tab/about): 新增自定义显示语言
- feat(core/settings/tab/about): 新增在“关于”中更新 core 的按钮

## v2.0.0-beta.10

- feat(core/ui/quick-open-panel): “快速打开面板”中在当前窗口打开文件
- feat(core): 在“快速打开面板”中排除指定文件夹

## v2.0.0-beta.9

- feat(core/component/notice): 添加右上角的提示气泡

## v2.0.0-beta.7

- feat(core/ui/sidebar/file-explorer): “文件管理”中显示不支持的文件
- feat(core/ui/editor): 在当前窗口打开 Markdown 超链接
- feat(core/settings/tab/plugin-manager): 显示已安装插件数量
- feat(core/ui/sidebar/search): 显示搜索结果所在文件的完整路径

## v2.0.0-beta.6

- feat(core/plugin/marketplace): 支持 Github 代理

## v2.0.0-beta.5

- feat(core/plugin): 支持卸载插件



[abcjs]: https://github.com/typora-community-plugin/typora-plugin-abcjs

[codeblock-highlight-mapper]: https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper

[collapsible-section]: https://github.com/typora-community-plugin/typora-plugin-collapsible-section

[code-folding]: https://github.com/typora-community-plugin/typora-plugin-code-folding

[drakmode]: https://github.com/typora-community-plugin/typora-plugin-darkmode

[front-matter]: https://github.com/typora-community-plugin/typora-plugin-front-matter

[image-location]: https://github.com/typora-community-plugin/typora-plugin-image-location

[image-viewer]: https://github.com/typora-community-plugin/typora-plugin-image-viewer

[tag]: https://github.com/typora-community-plugin/typora-plugin-tag
