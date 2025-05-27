# 特性更新日志

## Next

- chore(core/net): 显示更明确的网络请求的错误信息。

## v2.3.41

- fix(core/ui/components/menu): 修复点击文件侧栏空白处，右键菜单项不能展示的问题
- fix(core/ui/components/menu): 修复父菜单项前面有分割线或隐藏菜单项时，子菜单定位不准的问题

## v2.3.39

- feat(core/ui/components/menu): 支持自定义内部上下文菜单
- feat(core/ui/worlspace): 支持自定义文件管理器上下文菜单 `file-menu`
- feat(core/ui/components/menu): 支持级联上下文菜单

## v2.3.36

- feat(installer): 支持单用户安装的 Typora
- feat(common/events): 为插件 Trigger 提供 `getEventNames()`

- **新增插件**
  - [trigger][]: 为命令设置一个触发器，以自动执行。

- **插件更新**
  - [markmap][]: 自定义配置
  - [front-matter][]: 笔记聚焦时间统计

## v2.3.34

- fix: 在 macOS 不能从插件市场安装插件

## v2.3.33

- **新增插件**
  - [templater][]: 从模板创建笔记
    - feat: 从模板创建笔记
    - fix: 无法处理 Front Matter 的问题
    - fix: 从模板粘贴内容到当前笔记时，无法合并 Front Matter 的问题

- **插件更新**
  - [code-folding][]:
    - fix: 修复在 Linux 下不能折叠代码的问题
    - fix: 修复不能折叠 ruby & sql 的问题
  - [collapsible-section][]
    - feat: 使用命令窗口折叠/展开 h1~h6 标题 & 单纯引用块

## v2.3.32

- feat(core/ui/quick-open): 支持类 vscode 的 input-box & quick-pick
- fix(core/ui/ribbon): 修复在 macOS 下不能打开 APP 设置地问题 ([#36](https://github.com/typora-community-plugin/typora-community-plugin/issues/36))

## v2.3.30

- fix(core/ui/component/notice): 修复不能在 setMessage 之前 setCloseable 的问题
- fix(core/ui/editor/string-mask): 修复不能处理 `<direct-link>` 语法的问题

## v2.3.28

- feat(core/ui/components): 可关闭的提示信息
- feat(core/ui/editor/suggest): 支持自定义条目的类型（原本支持文本，现在也支持对象）
- feat(core/ui/editor/suggest): 支持在子语法内触发建议（原本只支持纯文本，内联语法被 Typora 格式化后无法识别）
- refactor(core/ui/editor): 暴露获取/设置 md 的 API

- **插件更新**
  - [footnotes][]: 
    - feat: 支持脚注标记（`[^` 触发）的自动完成
    - fix: 修复可能标号错误的问题

## v2.3.24

- fix(core/ui/editor/html-mask): 不能解析箭头 `<-`
- fix(core/ui/editor/html-mask): 不能解析非 html 标签，如 `<a\n`

- **新增插件**
  - [footnotes][]: 重新编号数字脚注

## v2.3.22

- fix(core/ui/tabs): 事件 'file:delete' 被触发时报错
- fix(core/ui/tabs): 重命名文件后不能重命名标签页

- **插件更新**
  - [collapsible-section][]
    - feat: 折叠/展开 引用块
    - feat: 折叠/展开 标注块
  - [image-viewer][]
    - feat: 包裹在 HTML 中的图片，点击时可以查看大图
  - [wikilink][]
    - fix: 修复不能缓存所有路径的问题
    - fix: 修复切换目录后触发太多事件的问题
    - fix: 修复有时不能使用输入建议的问题

## v2.3.20

- fix(core/ui/settings/tabs/marketplace): 在 macOS `app.plugin.marketplace` 调用可能先于创建的问题

## v2.3.19

- fix(core/ui/ribbon): 点击设置按钮丢失激活状态
- fix(core/ui/ribbon): 启动时隐藏 ribbon 会抛出错误
- fix(core/ui/sidebar): 启动后没有激活默认按钮

## v2.3.16

- fix(core/ui/ribbon): 修复关闭活动栏后不能再次显示的问题
- fix(core/ui/sidebar): 侧栏折叠时，点击非激活的 ribbon 无法显示侧栏
- refactor(core/ui/components/editable-table): 编辑中的行有更好的样式

## v2.3.13

- ~~fix(core/ui/ribbon): 修复关闭活动栏后不能再次显示的问题~~
- fix(core/ui/editor/link): 修复添加给有后缀文件添加 `.md` 的问题

## v2.3.11

- feat(croe/ui/editor): 超链接支持无后缀文件名时自动添加 `.md` 后缀，作为 Markdown 打开（类似 Obsidian）。默认关闭

## v2.3.10

- refactor(core/plugin): 暴露新 API 来注册 MarkdownEditor 事件 & 输入建议

## v2.3.9

- fix(core/app): 修复不能打开中文链接的问题
- fix(core/app): 修复不能打开前缀不为 `.` 的相对链接的问题
- fix(core/app): 修复不能打开被 `<>` 包裹的链接的问题

## v2.3.6

- fix(core/ui/tab/plugin-manager): 修复卸载再重新安装插件后，无法显示该插件的问题
- fix(core/app): 修复无法打开带锚点的超链接的问题

## v2.3.4

- fix(core/ui/components/tabs): 修复不能“关闭其他标签”和“关闭右侧标签”的问题

## v2.3.3

- fix(core/io/config): 修复不能从全局设置切换到本地配置的问题

## v2.3.2

- refactor(core/ui): 解耦控制器和 UI 视图
- fix(core/io/config): 修复启动后首次加载配置时，无法加载全局配置的问题
- chore(core,loader): 支持修改 `loader.json` 的 debug 属性为 `true` 打印用于调试的日志

- **新增插件**
  - [wavedrom][]: 在多行代码块中使用 Wavedrom

## v2.2.22

- fix(core/io/config): 修复不能正确加载语言文件的问题

## v2.2.21

- fix(core/ui): 修复来自 v2.2.20 的 Windows/Linux 下的布局问题

## v2.2.20

- fix(core/ui): 修复 macOS 下的布局问题

## v2.2.19

- refactor(core/ui/settings): 设置对话框显示它是全局还是本地配置
- fix(core/io/config): 命令面板中显示切换到当前配置的无用命令

## v2.2.17

- fix(core/commands): 修复不能解绑默认快捷键的问题
- fix(core/ui/tabs): 重命名文件后 Tab 丢失的问题

## v2.2.15

- fix(core/ui/tabs): 修复在 macOS 全屏下头部标题和文件标签页之间存在空隙的问题
- fix(core/ui/commands): 命令列表过长时，无法完全展示

## v2.2.13

- fix(core/ui/settings): 修复全屏时边框线消失的问题
- ~~fix(core/ui/tabs): 修复在 macOS 全屏下头部标题和文件标签页之间存在空隙的问题~~

## v2.2.11

- fix(core/io/vault): 修复在 macOS 不能触发文件变更事件的问题
- fix(core/ui/tabs): 修复在 macOS 头部标题和文件标签页之间存在空隙的问题
- refactor(core/ui): 统一活动指示器的宽度（活动 Ribbon、活动文件、活动 Tab）

## v2.2.8

- pref(core): 提高在 macOS 上的性能
- refactor(core/ui/ribbon): 活动栏图标更小、线条更细

## v2.2.6

- fix(core): 修复不能在 macOS 上使用的问题

## v2.2.5

- fix(core/commands): 从命令面板中隐藏“打开命令面板”的命令
- fix(core/ui/components/menu): 英文菜单项宽度不足

- **插件更新**
  - [note-snippets][]
    - fix: 修复不能从全局设置中加载笔记片段的问题

## v2.2.3

- fix(core/io/config): 修复不能保存全局设置的问题

## v2.2.2

- feat(core/io/config): 支持全局设置

- **破坏性变更**
  - refactor(core/io/vault): 移除方法 `vault.readConfigJson()` 和 `vault.writeConfigJson()`

- **插件更新**
  - [collapsible-section][]
    - feat: 保留手动折叠同时，支持禁用自动折叠
    - feat: 代码行数超过限制时才自动折叠

## v2.1.4

- fix(core/command/manager): 反注册命令失败的问题

## v2.1.3

- fix(core/command/manager): 改变目录后，没有重置所有用户快捷键的问题
- fix(core/settings): 监听器抛出异常后，阻止设置保存和其他监听器执行的问题
- fix(core/ui/components): 修复抬起鼠标时，会触发保存设置的问题
- fix(core/ui/quick-open-panel): 缺少注册事件监听器销毁回调的问题

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
