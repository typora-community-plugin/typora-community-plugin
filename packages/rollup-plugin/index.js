import fs from 'node:fs/promises'
import path from "node:path"
import url from "node:url"


const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const exportedTyporaVariables = JSON.parse(await fs.readFile(path.join(__dirname, 'exported-by-typora.json'), 'utf8'))

const exportedCoreModules = JSON.parse(await fs.readFile(path.join(__dirname, '/exported-by-core.json'), 'utf8'))

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
