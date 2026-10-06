# typora-plugin-installer

Auto setup typora-community-plugin

## Install

### Windows

If installing to `C:\Program Files\Typora` or `C:\Program Files (x86)\Typora`, administrator privileges are required. Other install paths do not need admin rights.

```powershell
# Auto-detect Typora installation path
&'install-windows.ps1'
# or use -p to manually specify the Typora installation path
&'install-windows.ps1' -p <typora_home>
```

### Linux

```bash
chmod +x install-linux.sh
su root

# Auto-detect Typora installation path
./install-linux.sh
# or use -p to manually specify the Typora installation path
./install-linux.sh -p <typora_home>
```

### macOS

macOS "System Settings" → "Privacy & Security" → "App Management" → allow "Terminal" to update or delete other applications

```bash
chmod +x install-macos.sh

# Auto-detect Typora installation path
./install-macos.sh
# or use -p to manually specify the Typora installation path
./install-macos.sh -p <typora_home>
```

## Uninstall

### Windows

If installing to `C:\Program Files\Typora` or `C:\Program Files (x86)\Typora`, administrator privileges are required. Other install paths do not need admin rights.

```powershell
# Auto-detect Typora installation path
&'uninstall-windows.ps1'
# or use -p to manually specify the Typora installation path
&'uninstall-windows.ps1' -p <typora_home>
```

### Linux

```bash
chmod +x uninstall-linux.sh
su root

# Auto-detect Typora installation path
./uninstall-linux.sh
# or use -p to manually specify the Typora installation path
./uninstall-linux.sh -p <typora_home>
```

### macOS

macOS "System Settings" → "Privacy & Security" → "App Management" → allow "Terminal" to update or delete other applications

```bash
chmod +x uninstall-macos.sh

# Auto-detect Typora installation path
./uninstall-macos.sh
# or use -p to manually specify the Typora installation path
./uninstall-macos.sh -p <typora_home>
```
