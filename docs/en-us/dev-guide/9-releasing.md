# Releasing a New Version

When your plugin has completed a development phase and functionality testing passes, you can consider releasing these changes as a new version.



## Incrementing the Version Number

Following [Semantic Versioning](https://semver.org/), increment your version number to get a *new version number*.

Edit `src/manifest.json` in the plugin project (for the template project) or `manifest.json` in the plugin root, and change the `version` field to the *new version number*.

> If you also maintain `minCoreVersion`, make sure it is not higher than the core version users actually have installed; core only strictly validates this field when enabling a plugin.



## Uploading

### Manual Packaging

1. Create a tag for the current git commit (named with the *new version number*, e.g. `1.0.0`)
2. Push commits and tags to GitHub
3. Run `pnpm run pack` in the terminal to package your plugin as `plugin.zip`
4. Create a Release on GitHub
   1. Associate the tag you just created, named with the version number
   2. Upload `plugin.zip`
   3. Create the Release

At this point, everyone can download the plugin from the Releases section of your plugin project.

Package layout:

```
plugin.zip
├── manifest.json   # from src/manifest.json
├── main.js         # from dist/
└── style.css       # from dist/ (optional)
```

### Automatic Packaging

The example plugin project [typora-plugin-example](https://github.com/typora-community-plugin/typora-plugin-example) comes with a GitHub Action that packages and releases automatically.

1. Create a tag for the current git commit (named with the *new version number*, e.g. `1.0.0`)
2. Push commits and tags to GitHub
   > When GitHub Action detects the *new version number*, it packages and publishes automatically

At this point, everyone can download the plugin from the Releases section of your plugin project.



## Publishing to the Plugin Marketplace

To make your plugin installable from the [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) marketplace, you can choose to publish it there.

First, fork the [typora-plugin-releases](https://github.com/typora-community-plugin/typora-plugin-releases) repository, edit the `community-plugins.json` file, and add your plugin's metadata. For example:

```json
{
  "id": "author.plugin-name",
  "name": "Plugin Name",
  "author": "author",
  "description": "Plugin description.",
  "repo": "github-user/github-repo",
  "platforms": ["win32", "linux", "darwin"]
}
```

Then create a pull request to the source repository and wait for it to be merged.

### Marketplace List Fields

`community-plugins.json` only contains the fields needed for marketplace display:

| Field | Description |
| --- | --- |
| `id` | Must match `id` in the plugin's `manifest.json`. |
| `name` | Display name. |
| `author` | Author name. |
| `description` | Description. |
| `repo` | GitHub repository in `owner/repo` form. |
| `platforms` | Supported operating systems. |

Fields such as `version`, `minAppVersion`, and `minCoreVersion` should still be written in the plugin's own `manifest.json`, not in the marketplace list.

### Localized Lists

The plugin marketplace also supports overriding display text by language:

```
community-plugins.json         # default list
community-plugins.zh-cn.json   # Simplified Chinese
community-plugins.en.json      # English
```

The file name pattern is `community-plugins.<locale>.json`; the field structure is the same as the default list.
