import * as fs from 'node:fs/promises'
import path from "node:path"
import url from "node:url"


const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const resolve = file => path.join(__dirname, file)
const readText = async file => fs.readFile(resolve(file), 'utf8')
const writeJSON = async (file, data) => fs.writeFile(resolve(file), JSON.stringify(data), 'utf8')


await readText('../types/index.d.ts')
  .then(code => code.match(/(?<=export declare (?:function|var|const|let) )\w+\b/g))
  .then(names => writeJSON('./exported-by-typora.json', [...new Set(names)].sort()))


await readText('../core/src/index.ts')
  .then(code => code.match(/(?<=export { (?:default as )?)\w+(?= })|(?<=export declare (?:function|var|const|let) )\w+\b/g))
  .then(names => writeJSON('./exported-by-core.json', [...new Set(names)].sort()))

