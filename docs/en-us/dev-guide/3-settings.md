# Settings

Configure the plugin on the settings page, with persistence used for configuration to the configuration file.

Shortcut keys do not need to add their own settings interface, unified in “Settings” > “Shortcut Keys” settings.



## Storage

Use the Plugin's `registerSettings()` to register the `PluginSettings` instance.

Then you can automatically access the `PluginSettings` instance through the Plugin's `settings`.



## Interface

Use the Plugin's `registerSettingTab()` to register `XxxSettingsTab` (inherited from the `SettingsTab` class).

Override the `show()` method in `XxxSettingsTab` to display the settings form.

Add setting fields to the settings form through the `addSetting()` method of `XxxSettingsTab`.



## Examples

- [typora-plugin-codeblock-highlight-mapper](https://github.com/typora-community-plugin/typora-plugin-codeblock-highlight-mapper)
- [typora-plugin-file-icon](https://github.com/typora-community-plugin/typora-plugin-file-icon)
- [typora-plugin-front-matter](https://github.com/typora-community-plugin/typora-plugin-front-matter)
- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets)
- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-wikilink](https://github.com/typora-community-plugin/typora-plugin-wikilink)
