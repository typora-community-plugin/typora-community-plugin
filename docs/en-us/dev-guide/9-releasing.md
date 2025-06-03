# Release a new version

When your plugin has completed a phase of development and the functionality tests are normal, you can consider releasing these changes as a new version.

## Incrementing the version number

According to [semantic versioning](https://semver.org/lang/zh-CN/), increment your version number to obtain a *new version number*.

Edit the value of the version field in the plugin's manifest.json to be the *new version number*.

## Upload

1. Create a tag for the current git commit (use the *new version number* as the name, e.g., `1.0.0`)
2. Push commits and tags to Github
3. Run `pnpm run pack` in the terminal to package your plugin into `plugin.zip`
4. Create a Release on Github
   1. Link the tag you just created, named with the version number
   2. Upload `plugin.zip`
   3. Create the Release

At this point, everyone can download the plugin from the Releases section of your plugin project.

## Publish to the plugin market

To make your plugin installable in the [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) plugin market, you can choose to publish it to the plugin market.

First, fork the repository [typora-plugin-releases](https://github.com/typora-community-plugin/typora-plugin-releases), and edit the file `community-plugins.json` to add your plugin's metadata, such as:

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

Then create a pull request to the source repository and wait for the repository to merge.
