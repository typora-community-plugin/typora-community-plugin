# macOS 文件操作助手

macOS 上的 Typora 每次执行 shell 命令都会弹出「允许 Typora 运行此 shell 命令？」的授权框，而且没有「记住我的选择」。插件系统的大多数文件操作（保存设置、索引元数据、安装与卸载插件等）原来都走 shell 命令，于是用起来会反复弹框。

[`typora-helper`](https://github.com/typora-community-plugin/typora-macos-helper) 是一个本地小程序，在后台提供文件操作服务。插件系统启动后优先连它，连不上才退回逐条执行 shell 命令。它只提供读写、复制、移动、删除、列目录这类文件操作，不能执行任意命令。

装好并接管后：

- 文件操作不再弹授权框。
- 不启用常驻服务时，每次启动 Typora 可能弹一次授权框（用于拉起这个助手）；允许后本次运行内不再弹。
- 其他仍需要执行系统命令的功能，仍可能按系统的规则弹框。

> Windows 和 Linux 不需要这个助手：只有 macOS 会为 shell 命令弹授权框。

## 是否需要安装

| 情况 | 建议 |
|------|------|
| 使用 macOS，且经常被文件操作的授权框打断 | 安装 |
| 使用 macOS，偶尔才看到授权框、不介意 | 可以不装，插件系统功能不受影响 |
| Windows / Linux | 不需要 |

要求：macOS 13 Ventura 及以上，并且已经安装 [Homebrew](https://brew.sh/)。

## 安装

```bash
brew install typora-community-plugin/tap/typora-helper
```

安装后完全退出并重新启动 Typora。启动时如果弹出「允许 Typora 运行此 shell 命令？」，点击允许，之后本次运行内不会再为文件操作弹框。

**不要**在授权框里点「取消」：取消会让本次运行放弃使用助手，之后的文件操作会重新逐条弹框，直到重启 Typora。

## 启用常驻模式（零弹窗）

上面的安装方式是「按需启动」，每次启动 Typora 仍可能弹一次框。如果希望连这一次也没有，可以让助手作为后台服务常驻：

```bash
brew services start typora-helper
```

启用后 Typora 启动时直接接管已有的服务，不再需要启动助手的授权框。助手会在登录后常驻，资源占用很小；不需要时执行：

```bash
brew services stop typora-helper
```

## 确认是否生效

1. 重启 Typora，打开或保存文档、修改一次设置。
2. 不再出现「允许 Typora 运行此 shell 命令？」，说明已经接管。
3. 也可以在终端确认进程存在：

   ```bash
   pgrep -fl typora-helper
   ```

   应能看到带 `serve` 的一行。

按需启动时，Typora 退出后约两分钟助手会自动退出；常驻模式下它会一直留在后台。

## 升级

```bash
brew upgrade typora-helper
```

启用常驻模式时，升级后执行 `brew services restart typora-helper`，让后台服务换成新版本；按需模式则在下次启动 Typora 时自动使用新版本。

## 卸载

```bash
brew services stop typora-helper    # 仅在启用过常驻模式时需要
brew uninstall typora-helper
```

卸载后插件系统照常工作，只是文件操作会恢复成逐条执行并弹出授权框。

## 常见问题

| 现象 | 处理 |
|------|------|
| 每个文件操作仍然弹框 | 助手没有被接管。先执行 `typora-helper --version` 确认能运行，再完全退出并重启 Typora |
| 启动时点了「取消」 | 本次运行已放弃助手，重启 Typora 并选择允许 |
| 笔记库在「文稿」「桌面」「下载」等受保护目录，操作报权限错误 | 打开「系统设置 → 隐私与安全性 → 文件与文件夹」，允许 `typora-helper` 访问该目录 |
| 希望恢复原来的弹框行为 | 按上方步骤卸载，或执行 `brew services stop typora-helper` 后改用按需模式 |

## 相关页面

- [如何安装](./1a-installation.md)
- [如何卸载](./1b-uninstall.md)
- [设置总览](./3-settings.md)
