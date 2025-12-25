import * as fs from 'fs'


main()

function main() {
  if (!fs.existsSync(`./dist`)) fs.mkdirSync(`./dist`)
  buildWindowsScript()
  buildBash()
}

function buildWindowsScript() {
  const OPTIONS = {
    FIND_TYPORA_HOME: fs.readFileSync(`./templates/windows/find-home.ps1`, 'utf8'),
    FIND_WINDOW_HTML: removeEnv(fs.readFileSync(`./templates/windows/find-window-html.ps1`, 'utf8'), 'TEST'),
    FIND_USERDATA_DIR: removeEnv(fs.readFileSync(`./templates/windows/find-userdata.ps1`, 'utf8'), 'TEST'),
  }

  const installerWin = fillTemplate(fs.readFileSync(`./templates/windows/install.ps1`, 'utf8'), OPTIONS)
  const uninstallerWin = fillTemplate(fs.readFileSync(`./templates/windows/uninstall.ps1`, 'utf8'), OPTIONS)

  fs.writeFileSync(`./dist/install-windows.ps1`, installerWin, 'utf8')
  fs.writeFileSync(`./dist/uninstall-windows.ps1`, uninstallerWin, 'utf8')
}

function buildBash() {
  const OPTIONS = {
    FIND_TYPORA_HOME: fs.readFileSync(`./templates/find-home.sh`, 'utf8'),
    FIND_WINDOW_HTML: fs.readFileSync(`./templates/find-window-html.sh`, 'utf8'),
    FIND_USERDATA_DIR: fs.readFileSync(`./templates/find-userdata.sh`, 'utf8'),
  }

  const installerBash = fs.readFileSync(`./templates/install.sh`, 'utf8')
  const uninstallerBash = fs.readFileSync(`./templates/uninstall.sh`, 'utf8')

  buildLinuxScript(installerBash, uninstallerBash, OPTIONS)
  buildMacosScript(installerBash, uninstallerBash, OPTIONS)
}

function buildLinuxScript(installerBash, uninstallerBash, OPTIONS) {
  const LINUX_OPTIONS = {
    FIND_TYPORA_HOME: removeEnv(OPTIONS.FIND_TYPORA_HOME, 'MACOS'),
    FIND_WINDOW_HTML: removeEnv(OPTIONS.FIND_WINDOW_HTML, 'MACOS'),
    FIND_USERDATA_DIR: removeEnv(OPTIONS.FIND_USERDATA_DIR, 'MACOS'),
  }

  installerBash = fillTemplate(installerBash, LINUX_OPTIONS)
  uninstallerBash = fillTemplate(uninstallerBash, LINUX_OPTIONS)

  fs.writeFileSync(`./dist/install-linux.sh`, installerBash, 'utf8')
  fs.writeFileSync(`./dist/uninstall-linux.sh`, uninstallerBash, 'utf8')
}

function buildMacosScript(installerBash, uninstallerBash, OPTIONS) {
  const MACOS_OPTIONS = {
    FIND_TYPORA_HOME: removeEnv(OPTIONS.FIND_TYPORA_HOME, 'LINUX'),
    FIND_WINDOW_HTML: removeEnv(OPTIONS.FIND_WINDOW_HTML, 'LINUX'),
    FIND_USERDATA_DIR: removeEnv(OPTIONS.FIND_USERDATA_DIR, 'LINUX'),
  }

  installerBash = fillTemplate(installerBash, MACOS_OPTIONS)
  uninstallerBash = fillTemplate(uninstallerBash, MACOS_OPTIONS)

  fs.writeFileSync(`./dist/install-macos.sh`, installerBash, 'utf8')
  fs.writeFileSync(`./dist/uninstall-macos.sh`, uninstallerBash, 'utf8')
}

function removeEnv(script, env) {
  return script.replace(new RegExp(`# ${env}_START(.|\\n)+?# ${env}_END`, 'g'), '')
}

function fillTemplate(script, options) {
  return script
    .replace('# {{ FIND_TYPORA_HOME }}', () => options.FIND_TYPORA_HOME)
    .replace('# {{ FIND_WINDOW_HTML }}', () => options.FIND_WINDOW_HTML)
    .replace('# {{ FIND_USERDATA_DIR }}', () => options.FIND_USERDATA_DIR)
}
