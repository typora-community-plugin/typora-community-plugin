import * as child_process from 'node:child_process'
import * as fs from 'node:fs/promises'


await fs.rm('./typings', { recursive: true, force: true })

child_process.execSync('tspc -p .', { cwd: process.cwd() })

await fs.copyFile('./src/utils/types.d.ts', './typings/utils/types.d.ts')

const blackList = [
  './typings/core.d.ts',
  './typings/devtools.d.ts',
]
await Promise.all(
  blackList.map(file =>
    fs.rm(file, { recursive: true, force: true })))
