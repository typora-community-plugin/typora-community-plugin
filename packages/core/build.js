import * as child_process from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as esbuild from 'esbuild'
import typoraPlugin from 'esbuild-plugin-typora'
import { sassPlugin } from 'esbuild-sass-plugin'
import packageInfo from './package.json' assert { type: "json" }


const args = process.argv.slice(2)
const IS_PROD = args.includes('--prod')
const IS_DEV = !IS_PROD

await fs.rm(`${process.cwd()}/dist`, { recursive: true, force: true })

await esbuild.build({
  entryPoints: ['src/core.ts'],
  outdir: 'dist',
  format: 'esm',
  bundle: true,
  minify: IS_PROD,
  sourcemap: IS_DEV,
  define: {
    'process.env.CORE_VERSION': `"${packageInfo.version}"`,
  },
  plugins: [
    typoraPlugin(),
    sassPlugin(),
  ],
})

await fs.cp(
  `${process.cwd()}/src/locales`,
  `${process.cwd()}/dist/locales`,
  { recursive: true }
)

await fs.rm(`${process.cwd()}/dist/locales/i18n.ts`)


if (IS_DEV) {
  await fs.rm(path.join(process.env.USERPROFILE, '.typora/plugins/.lock/win-test'))
    .catch(() => { })

  child_process.exec('Typora ./test/vault/doc.md')
}
