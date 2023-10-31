import fs from 'node:fs/promises'
import path from "node:path"
import url from "node:url"


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
