# 发布一个新版本

当你的插件完成了一个阶段的开发，并且功能测试正常后。可以考虑将这些变更发布为一个新版本。



## 递增版本号

根据[语义化版本](https://semver.org/lang/zh-CN/)，递增你的版本号，得到一个*新版本号*。

编辑插件的 manifest.json 中的 version 字段的值为*新版本号*。



## 上传

1. 为当前的 git commit 创建一个标签 (使用*新版本号*命名，如 `1.0.0`)
2. 推送 commits 和 tags 到 Github
3. 在终端运行 `pnpm run pack` 打包你的插件为 `plugin.zip`
4. 在 Github 编写一个 Release
	1. 关联刚才创建的、使用版本号命名的标签
	2. 上传 `plugin.zip` 
	3. 创建 Release

此时，大家就可以从你的插件项目的 Releases 中下载插件。



## 发布到插件市场

为了在 [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) 的插件市场中能够安装你的插件，可以选择发布到插件市场。

首先 Fork 仓库 [typora-plugin-releases](https://github.com/typora-community-plugin/typora-plugin-releases)，并编辑文件 `community-plugins.json`，添加你的插件的元数据。如：

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

然后创建一个 pull request 到源仓库，等待仓库合并。
