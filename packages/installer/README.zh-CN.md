# typora-plugin-installer

自动安装 typora-community-plugin

## 安装

### Windows

需要使用管理员权限运行

```powershell
# 自动查找 Typora 安装路径
&'install-windows.ps1'
# 或者使用参数 -p 手动指定 Typora 安装路径
&'install-windows.ps1' -p <typora_home>
```

### Linux

```bash
chmod +x install-linux.sh
su root

# 自动查找 Typora 安装路径
./install-linux.sh
# 或者使用参数 -p 手动指定 Typora 安装路径
./install-linux.sh -p <typora_home>
```

### macOS

macOS 设置 → 隐私与安全 → App 管理 → 允许 "Terminal" 修改或删除其他应用程序

```bash
chmod +x install-linux.sh

# 自动查找 Typora 安装路径
./install-macos.sh
# 或者使用参数 -p 手动指定 Typora 安装路径
./install-macos.sh -p <typora_home>
```

## 卸载

### Windows

需要使用管理员权限运行

```powershell
# 自动查找 Typora 安装路径
&'uninstall-windows.ps1'
# 或者使用参数 -p 手动指定 Typora 安装路径
&'uninstall-windows.ps1' -p <typora_home>
```

### Linux

```bash
chmod +x uninstall-linux.sh
su root

# 自动查找 Typora 安装路径
./uninstall-linux.sh
# 或者使用参数 -p 手动指定 Typora 安装路径
./uninstall-linux.sh -p <typora_home>
```

### macOS

macOS 设置 → 隐私与安全 → App 管理 → 允许 "Terminal" 修改或删除其他应用程序

```bash
chmod +x uninstall-linux.sh

# 自动查找 Typora 安装路径
./uninstall-macos.sh
# 或者使用参数 -p 手动指定 Typora 安装路径
./uninstall-macos.sh -p <typora_home>
```
