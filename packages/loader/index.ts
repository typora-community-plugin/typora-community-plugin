import { File, _options, bridge, reqnode } from 'typora'


(function main() {

  const mountFolder = _options.mountFolder
    || dirname(_options.initFilePath || File.bundle.filePath)

  const settings = (mountFolder && readText(`${mountFolder}/.typora/env.json`)) || '{}'

  const env = JSON.parse(settings)

  const loaderConfigPath = `${_options.userDataPath}/plugins/loader.json`
  const loaderConfig = JSON.parse(readText(loaderConfigPath))

  const pluginCore = env.PLUGIN_CORE_PATH
    ? env.PLUGIN_CORE_PATH.replace(/\{VAULT\}/, mountFolder)
    : `./${loaderConfig.coreVersion}/core.js`

  import(pluginCore)

})()

function dirname(filepath: string) {
  return filepath && filepath.split(/\b(?=[\\\/]+)/).slice(0, -1).join('')
}

function readText(filepath: string) {
  if (File.isNode) {
    const fs = reqnode('fs')
    return fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf8') : ''
  }
  else {
    return bridge.callSync('path.readText', filepath)
  }
}
