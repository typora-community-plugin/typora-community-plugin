import * as fs from 'fs'
import * as path from 'path'
import { _options } from 'typora'

const mountFolder = _options.mountFolder
  ?? path.dirname(_options.initFilePath)

const envPath = `${mountFolder}/.typora/env.json`

const settings = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, 'utf8')
  : '{}'

const env = JSON.parse(settings)

const pluginCore = env.PLUGIN_CORE_PATH
  ? path.resolve(env.PLUGIN_CORE_PATH.replace(/\{VAULT\}/, mountFolder))
  : './core.js'

import(pluginCore)
