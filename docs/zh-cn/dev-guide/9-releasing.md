# 发布一个新版本

当你的插件完成了一个阶段的开发，并且功能测试正常后，可以考虑将这些变更发布为一个新版本。



## 递增版本号

根据[语义化版本](https://semver.org/lang/zh-CN/)，递增你的版本号，得到一个*新版本号*。

编辑插件项目中的 `src/manifest.json`（模板项目）或插件根目录的 `manifest.json`，把 `version` 字段改为*新版本号*。

> 如果同时维护 `minCoreVersion`，请确认它不高于用户实际安装的 core 版本；core 启用插件时只强制校验该字段。



## 上传

### 手动打包

1. 为当前的 git commit 创建一个标签（使用*新版本号*命名，如 `1.0.0`）
2. 推送 commits 和 tags 到 GitHub
3. 在终端运行 `pnpm run pack` 打包你的插件为 `plugin.zip`
4. 在 GitHub 编写一个 Release
   1. 关联刚才创建的、使用版本号命名的标签
   2. 上传 `plugin.zip`
   3. 创建 Release

此时，大家就可以从你的插件项目的 Releases 中下载插件。

打包产物结构：

```
plugin.zip
├── manifest.json   # 来自 src/manifest.json
├── main.js         # 来自 dist/
└── style.css       # 来自 dist/（可选）
```

### 自动打包

示例插件项目 [typora-plugin-example](https://github.com/typora-community-plugin/typora-plugin-example) 自带了自动打包发布的 GitHub Action。

1. 为当前的 git commit 创建一个标签（使用*新版本号*命名，如 `1.0.0`）
2. 推送 commits 和 tags 到 GitHub
   > GitHub Action 检查到*新版本号*将会自动打包并发布

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

### 市场列表字段

`community-plugins.json` 只包含市场展示所需的字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 与插件 `manifest.json` 中的 `id` 一致。 |
| `name` | 展示名。 |
| `author` | 作者名。 |
| `description` | 描述。 |
| `repo` | `owner/repo` 形式的 GitHub 仓库。 |
| `platforms` | 支持的操作系统。 |

`version`、`minAppVersion`、`minCoreVersion` 等仍应写在插件自身的 `manifest.json` 中，不要放进市场列表。

### 本地化列表

插件市场还支持按语言覆盖展示文本：

```
community-plugins.json         # 默认列表
community-plugins.zh-cn.json   # 简体中文
community-plugins.en.json      # 英语
```

文件名规则为 `community-plugins.<locale>.json`，字段结构与默认列表一致。
