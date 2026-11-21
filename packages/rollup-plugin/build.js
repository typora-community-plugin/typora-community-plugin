import * as fs from 'node:fs/promises'
import path from "node:path"
import url from "node:url"


const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const resolve = file => path.join(__dirname, file)
const readText = async file => fs.readFile(resolve(file), 'utf8')
const writeJSON = async (file, data) => fs.writeFile(resolve(file), JSON.stringify(data), 'utf8')


// Matches one `export` statement and captures its kind:
//   1. `type`    — `export type { ... }`            (skipped, not a runtime value)
//   2. list      — `export { a, b as c } from '...'`
//   3. declare   — `export declare const|let|var|function|class|enum name`
//   4. star      — `export * from '...'`            (rejected, can't be resolved statically)
const exportStatement = () =>
  /export\s+(?:(type)\s+)?(?:\{([^}]*)\}|(declare)\s+(?:function|var|const|let|class|enum)\s+([A-Za-z_$][\w$]*)|(\*)\s*(?:as\s+[\w$]+\s*)?from)/g

/**
 * Collect the names that a module exports at runtime.
 *
 * Unlike a plain regex, this understands multi-specifier and aliased export
 * lists (`export { A, B as C }`) and ignores type-only exports, so the
 * generated list matches the module namespace object plugins actually get.
 */
function collectExportedNames(code, file) {
  // Strip comments so `export` in docs is not picked up.
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')

  const names = new Set()

  for (const [, typeOnly, list, isDeclare, declaredName, star] of stripped.matchAll(exportStatement())) {
    if (star) {
      throw new Error(`${file}: \`export *\` cannot be resolved statically, enumerate the exported names instead`)
    }
    if (typeOnly) continue

    if (isDeclare) {
      names.add(declaredName)
      continue
    }

    for (const specifier of list.split(',')) {
      const spec = specifier.trim()
      // `export { type A, B }` — inline type specifiers are not runtime values.
      if (!spec || spec.startsWith('type ')) continue
      const alias = spec.match(/^(?:[\w$]+|default)\s+as\s+([\w$]+)$/)
      names.add(alias ? alias[1] : spec)
    }
  }

  for (const name of names) {
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
      throw new Error(`${file}: invalid exported name "${name}"`)
    }
  }

  const rest = stripped.replace(exportStatement(), '')
  if (/(^|[\s;}])export\b/m.test(rest)) {
    throw new Error(`${file}: unsupported \`export\` statement, update build.js to handle it`)
  }

  if (names.size === 0) {
    throw new Error(`${file}: no exported names found`)
  }

  return [...names].sort()
}


await readText('../types/index.d.ts')
  .then(code => code.match(/(?<=export declare (?:function|var|const|let) )\w+\b/g))
  .then(names => writeJSON('./exported-by-typora.json', [...new Set(names)].sort()))


await readText('../core/src/index.ts')
  .then(code => collectExportedNames(code, '../core/src/index.ts'))
  .then(names => writeJSON('./exported-by-core.json', names))
