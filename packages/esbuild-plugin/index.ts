import * as fs from 'fs/promises'
import * as path from 'path'
import * as modules from 'node:module'


const internalModules: Record<string, string> = {
  'extract-zip': 'extract-zip',
  'yauzl': 'extract-zip/node_modules/yauzl',

  'glob': 'fs-plus/node_modules/glob',
  'iconv-lite': 'iconv-lite',
  'lodash': 'lowdb/node_modules/lodash',
}

interface Options {
  mode?: 'development' | 'production'
}

const DEFAULT_SETTINGS = {
  mode: 'production',
}

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
      // handle: app.ts
      .replace('window[Symbol.for("typora-plugin-core")]',
        mode === 'development'
          ? `window.Typora = window[${coreModuleId}]`
          : `window[${coreModuleId}]`
      )
  }
}
