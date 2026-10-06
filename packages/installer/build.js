import * as fs from 'fs'
import * as path from 'path'


main()

function main() {
  if (!fs.existsSync(`./dist`)) fs.mkdirSync(`./dist`)
  buildWindowsScript()
  buildBash()
}

function buildWindowsScript() {
  fs.writeFileSync(`./dist/install-windows.ps1`, buildScript(`./templates/windows/install.ps1`, 'TEST'), 'utf8')
  fs.writeFileSync(`./dist/uninstall-windows.ps1`, buildScript(`./templates/windows/uninstall.ps1`, 'TEST'), 'utf8')
}

function buildBash() {
  fs.writeFileSync(`./dist/install-linux.sh`, buildScript(`./templates/install.sh`, 'MACOS'), 'utf8')
  fs.writeFileSync(`./dist/uninstall-linux.sh`, buildScript(`./templates/uninstall.sh`, 'MACOS'), 'utf8')

  fs.writeFileSync(`./dist/install-macos.sh`, buildScript(`./templates/install.sh`, 'LINUX'), 'utf8')
  fs.writeFileSync(`./dist/uninstall-macos.sh`, buildScript(`./templates/uninstall.sh`, 'LINUX'), 'utf8')
}

function buildScript(file, env) {
  return removeEnv(importFiles(file), env)
}

function importFiles(file) {
  const dir = path.dirname(file)
  const script = fs.readFileSync(file, 'utf8')

  return script.replace(/^[^\S\r\n]*# @import +"([^"]+)"[^\S\r\n]*\r?\n/gm, (_, importPath) => {
    return importFiles(path.resolve(dir, importPath))
  })
}

function removeEnv(script, env) {
  return script.replace(new RegExp(`# ${env}_START(.|\\n)+?# ${env}_END`, 'g'), '')
}
