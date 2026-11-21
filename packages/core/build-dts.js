import * as child_process from 'node:child_process'
import * as fs from 'node:fs/promises'


await fs.rm('./typings', { recursive: true, force: true })

try {
  child_process.execSync('tspc -p .', { cwd: process.cwd(), stdio: 'inherit' })
} catch (e) {
  if (e.stdout) console.error(e.stdout.toString())
  if (e.stderr) console.error(e.stderr.toString())
  process.exit(1)
}

await fs.copyFile('./src/utils/types.d.ts', './typings/utils/types.d.ts')

const blackList = [
  './typings/core.d.ts',
  './typings/devtools.d.ts',
  // dev demos and test infra, not part of the plugin development typings
  './typings/setup-test-env.d.ts',
  './typings/plugin-internal/plugins/plugin-test.d.ts',
  './typings/plugin-internal/plugins/plugin-test-manifest.d.ts',
  './typings/ui/components/editable-table-test.d.ts',
  './typings/ui/editor/codeblock/codeblock-test.d.ts',
  './typings/ui/editor/suggestion/suggest-test.d.ts',
  './typings/ui/layout/floating/index-test.d.ts',
  './typings/ui/layout/sidedock/index-test.d.ts',
  './typings/ui/settings/setting-item-test.d.ts',
  './typings/ui/statusbar/statistics-test.d.ts',
]
await Promise.all(
  blackList.map(file =>
    fs.rm(file, { recursive: true, force: true })))
