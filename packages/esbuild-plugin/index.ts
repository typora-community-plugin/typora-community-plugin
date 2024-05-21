import * as fs from 'fs/promises'
import * as path from 'path'
import * as modules from 'node:module'


const internalModules: Record<string, string> = {
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

interface Options {
  mode?: 'development' | 'production'
}

const DEFAULT_SETTINGS = {
  mode: 'production',
}

/**
 * esbuild plugin for Typora.
 */
export default function typoraPlugin(options: Options) {

  const { mode } = Object.assign({}, DEFAULT_SETTINGS, options)
  const coreModuleId = 'Symbol.for("typora-plugin-core@v2")'

  return {
    name: 'typora-plugin',
    setup(build: any) {
      build.onLoad({ filter: /\.[jt]sx?$/ }, async (args: any) => {
        const ext = path.extname(args.path).slice(1)
        const code = await fs.readFile(args.path, 'utf8')
        const result = /[\\/]node_modules[\\/]/.test(args.path)
          ? code
          : transform(code)
        return {
          loader: ext,
          contents: result
        }
      })
    },
  }

  function transform(text: string) {
    return [text]
      .map(resolveCommonJs)
      .map(removeTypescriptType)
      .map(resolveTypora)
      .map(transformImportStatementToFunction)
      .map(resolveModules)
      .pop()
  }

  function resolveCommonJs(text: string) {
    return text.replace(/require\(/g, 'reqnode(')
  }

  function removeTypescriptType(text: string) {
    return text
      // handle: TypeScript Type Import
      .replace(/import type .+? from ['"][^'"]+['"];?/g, '')
      // handle: TypeScript Partial Import with Type
      .replace(/(import \{)([^}]+)(\} from ['"][^'"]+['"];?)/g, (_, $1, exports: string, $3) => {
        if (exports.includes('type ')) {
          const filtered = exports.split(',')
            .map(s => s.trim())
            .filter(s => !s.startsWith('type '))
          if (!filtered.length) return ''
          return $1 + filtered.join(', ') + $3
        }
        return _
      })
      // handle: locales/lang.*.json as Type
      .replace(/import [^ ]+ from ['"][^'"]+\/locales\/lang\.[\w-]+\.json['"];?/g, '')
  }

  function resolveTypora(text: string) {
    return text.replace(/import .+? from ['"]typora['"];?/g, '')
  }

  function transformImportStatementToFunction(text: string) {
    return text
      // handle: ESM - Default Import
      .replace(/import ([^{ ]+?) from (['"][^'"]+['"])/g, 'const { default: $1 } = await import($2)')
      // handle: ESM - All/Partial Import
      .replace(/import (?:\* +as +)?(.+?) from (['"][^'"]+['"])/g, 'const $1 = await import($2)')
  }

  function resolveModules(text: string) {
    return text
      .replace(/await import\(['"]([^'"]+)['"]\)/g, (_, $1: string) => {
        if (modules.builtinModules.includes($1)) {
          return `reqnode("${$1}")`
        }
        if (internalModules[$1]) {
          return `reqnode("${internalModules[$1]}")`
        }
        // handle: plugin implement
        if ($1 === '@typora-community-plugin/core') {
          return `window[${coreModuleId}]`
        }
        return _
      })
  }
}

/**
 * Try closing Typora which running the plugin in development.
 */
export async function closeTypora() {
  const lockDir = path.join(process.env.USERPROFILE, '.typora/community-plugins/_lock')

  await fs.access(lockDir)
    .catch(() => fs.mkdir(lockDir))
    .then(() => fs.rm(path.join(lockDir, 'win-test')))
    .catch(() => { })
}

/**
 * Install the compiled plugin files into the vault for testing.
 */
export async function installDevPlugin(valut?: string) {
  const root = path.dirname(process.argv[1])

  valut ??= `${root}/test/vault`

  const manifestPath = path.join(root, `./src/manifest.json`)
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  await fs.copyFile(manifestPath, `${root}/dist/manifest.json`)

  await fs.access(`${root}/dist/main.css`)
    .then(() => Promise.all([
      fs.rename(`${root}/dist/main.css`, `${root}/dist/style.css`),
      fs.rename(`${root}/dist/main.css.map`, `${root}/dist/style.css.map`),
    ]))
    .catch(() => { })

  await fs.cp(`${root}/dist`, `${valut}/.typora/plugins/dist`, { recursive: true })

  await fs.writeFile(`${valut}/.typora/plugins.json`, JSON.stringify({ [manifest.id]: true }))
}
