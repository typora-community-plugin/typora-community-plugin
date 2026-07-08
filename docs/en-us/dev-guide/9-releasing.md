# Releasing a New Version

When your plugin has completed a development phase and functionality testing passes, you can consider releasing these changes as a new version.

## Incrementing the Version Number

Following [Semantic Versioning](https://semver.org/), increment your version number to get a *new version number*.

Edit the `version` field in your plugin's `manifest.json` to the *new version number*.

## Uploading

### Manual Packaging

1. Create a tag for the current git commit (named with the *new version number*, e.g., `1.0.0`)
2. Push commits and tags to GitHub
3. Run `pnpm run pack` in the terminal to package your plugin as `plugin.zip`
4. Create a Release on GitHub
   1. Associate the tag you just created, named with the version number
   2. Upload `plugin.zip`
   3. Create the Release

At this point, everyone can download the plugin from the Releases section of your plugin project.

### Automatic Packaging

The example plugin project [typora-plugin-example](https://github.com/typora-community-plugin/typora-plugin-example) comes with a GitHub Action for automatic packaging and release.

1. Create a tag for the current git commit (named with the *new version number*, e.g., `1.0.0`)
2. Push commits and tags to GitHub
   > When GitHub Action detects the *new version number*, it will automatically package and publish

At this point, everyone can download the plugin from the Releases section of your plugin project.

## Publishing to the Plugin Marketplace

To make your plugin installable from the [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) marketplace, you can choose to publish it to the plugin marketplace.

First, fork the repository [typora-plugin-releases](https://github.com/typora-community-plugin/typora-plugin-releases), and edit the `community-plugins.json` file to add your plugin's metadata. For example:

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
