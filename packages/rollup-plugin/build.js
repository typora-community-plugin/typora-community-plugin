import * as fs from 'node:fs/promises'


const typoraTypes = await fs.readFile('../types/index.d.ts', 'utf8')

const exportedTyporaVariables = typoraTypes.match(/(?<=export declare (?:function|var|const|let) )\w+\b/g)

await fs.writeFile('./exported-by-typora.json', JSON.stringify([...exportedTyporaVariables]), 'utf8')


const coreModules = await fs.readFile('../core/src/index.ts', 'utf8')

const exportedCoreModules = coreModules.match(/(?<=export { (?:default as )?)\w+(?= })|(?<=export declare (?:function|var|const|let) )\w+\b/g)

await fs.writeFile('./exported-by-core.json', JSON.stringify([...exportedCoreModules]), 'utf8')
