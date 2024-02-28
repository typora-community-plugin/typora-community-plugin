# 设置

在设置页配置插件，持久化用于配置到配置文件。

快捷键不需要自行添加设置界面，统一在 “设置” > “快捷键” 设置。



## 存储

使用 Plugin 的 `registerSettings()` 注册 `PluginSettings` 实例。

然后可以通过 Plugin 的 `settings` 自动访问 `PluginSettings` 实例。



## 界面

使用 Plugin 的 `registerSettingTab()` 注册 `XxxSettingsTab`（继承自 `SettingsTab` 类）。

在 `XxxSettingsTab` 中重写 `show()` 方法用于显示设置表单。

通过 `XxxSettingsTab` 的 `addSetting()` 方法为设置表单添加设置字段。



## 例子

- [typora-plugin-codeblock-highlight-mapper](https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper)
- [typora-plugin-file-icon](https://github.com/typora-community-plugin/typora-plugin-file-icon)
- [typora-plugin-front-matter](https://github.com/typora-community-plugin/typora-plugin-front-matter)
- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets)
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink)