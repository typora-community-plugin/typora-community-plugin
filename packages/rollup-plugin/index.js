import fs from 'node:fs/promises'
import path from "node:path"
import url from "node:url"
import * as modules from 'node:module'


const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const resolve = file => path.join(__dirname, file)
const readJSON = async file => JSON.parse(await fs.readFile(resolve(file), 'utf8'))

const exportedTyporaVariables = await readJSON('exported-by-typora.json')

const exportedCoreModules = await readJSON('exported-by-core.json')

export const virtualModules = {
  'typora':
    exportedTyporaVariables
      .map(o => `export const ${o} = window.${o};`)
      .join(''),

  '@typora-community-plugin/core':
    'const exported = window[Symbol.for("typora-plugin-core@v2")];' +
    exportedCoreModules
      .map(o => `export const ${o} = exported.${o};`)
      .join(''),
}

const internalModules = {
  'extract-zip': 'extract-zip',
  'mkdirp': 'extract-zip/node_modules/mkdirp',
  'yauzl': 'extract-zip/node_modules/yauzl',

  'fs-extra': 'fs-extra',

  'fs-plus': 'fs-plus',
  'async': 'fs-plus/node_modules/async',
  'brace-expansion': 'fs-plus/node_modules/brace-expansion',
  'glob': 'fs-plus/node_modules/glob',
  'minimatch': 'fs-plus/node_modules/minimatch',
  'rimraf': 'fs-plus/node_modules/rimraf',
  'underscore': 'fs-plus/node_modules/underscore',
  'underscore-plus': 'fs-plus/node_modules/underscore-plus',

  'getos': 'getos',
  'hjson': 'hjson',
  'iconv-lite': 'iconv-lite',
  'jschardet': 'jschardet',
  'jsonfile': 'jsonfile',
  'native-reg': 'native-reg',
  'node-machine-id': 'node-machine-id',

  'lowdb': 'lowdb',
  'lodash': 'lowdb/node_modules/lodash',

  // raven
  'md5': 'raven/node_modules/md5',
  'uuid': 'raven/node_modules/uuid',

  'spellchecker': 'spellchecker',

  'vscode-ripgrep': 'vscode-ripgrep',
  'debug': 'vscode-ripgrep/node_modules/debug',
  'ms': 'vscode-ripgrep/node_modules/ms',
}

export function typoraPlugin() {
  return {
    name: 'typora-plugin',
    transform(code, id) {
      if (!/\.ts$/.test(id)) return;
      const newCode = [code]
        .map(resolveCommonJs)
        .map(resolveModules)
        .pop();
      return { code: newCode, map: null };
    }
  }
}

function resolveCommonJs(text) {
  return text.replace(/require\(/g, 'reqnode(')
}

function resolveModules(text) {
  return text
    // handle: ESM - Default Import
    .replace(/import ([^{ ]+?) from ['"]([^'"]+)['"]/g, (_, $1, $2) => {
      if (modules.builtinModules.includes($2)) {
        return `const { default: ${$1} } = reqnode("${$2}")`
      }
      if (internalModules[$2]) {
        return `const { default: ${$1} } = reqnode("${internalModules[$2]}")`
      }
      return _
    })
    // handle: ESM - All/Partial Import
    .replace(/import (?:\* +as +)?(.+?) from ['"]([^'"]+)['"]/g, (_, $1, $2) => {
      if (modules.builtinModules.includes($2)) {
        return `const ${$1} = reqnode("${$2}")`
      }
      if (internalModules[$2]) {
        return `const ${$1} = reqnode("${internalModules[$2]}")`
      }
      return _
    })
}
