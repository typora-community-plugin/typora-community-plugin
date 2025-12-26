# typora-plugin-installer

Auto setup typora-community-plugin

## Install

### Windows

Run as administrator

```powershell
&'install-windows.ps1'
# or custom install postion
&'install-windows.ps1' -p <typora_home>
```

### Linux

```bash
chmod +x install-linux.sh
su root

./install-linux.sh
# or custom install postion
./install-linux.sh -p <typora_home>
```

### macOS

macOS "System Settings" → "Privacy & Security" → "App Management" → allow "Terminal" to update or delete other applications

```bash
chmod +x install-linux.sh

./install-macos.sh
# or custom install postion
./install-macos.sh -p <typora_home>
```

## Uninstall

### Windows

Run as administrator

```powershell
&'uninstall-windows.ps1'
# or custom install postion
&'uninstall-windows.ps1' -p <typora_home>
```

### Linux

```bash
chmod +x uninstall-linux.sh
su root

./uninstall-linux.sh
# or custom install postion
./uninstall-linux.sh -p <typora_home>
```

### macOS

macOS "System Settings" → "Privacy & Security" → "App Management" → allow "Terminal" to update or delete other applications

```bash
chmod +x uninstall-linux.sh

./uninstall-macos.sh
# or custom install postion
./uninstall-macos.sh -p <typora_home>
```
