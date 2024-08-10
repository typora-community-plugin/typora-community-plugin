import * as child_process from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as esbuild from 'esbuild'
import typoraPlugin, { closeTypora } from 'esbuild-plugin-typora'
import { sassPlugin } from 'esbuild-sass-plugin'


const args = process.argv.slice(2)
const IS_PROD = args.includes('--prod')
const IS_DEV = !IS_PROD

const packageInfo = JSON.parse(await fs.readFile('./package.json', 'utf8'))

await fs.rm('./dist', { recursive: true, force: true })

await esbuild.build({
  entryPoints: ['src/core.ts'],
  outdir: 'dist',
  format: 'esm',
  bundle: true,
  minify: IS_PROD,
  sourcemap: IS_DEV,
  define: {
    'process.env.CORE_NS': `"typora-plugin-core@v2"`,
    'process.env.CORE_VERSION': `"${packageInfo.version}"`,
    'process.env.IS_PROD': `${IS_PROD}`,
    'process.env.IS_DEV': `${IS_DEV}`,
    'process.env.IS_TEST': 'false',
    'process.env.BUILD_TIME': `"${new Date().toLocaleString('zh-cn')}"`,
  },
  plugins: [
    typoraPlugin({
      mode: IS_PROD ? 'production' : 'development'
    }),
    sassPlugin(),
  ],
})

await fs.cp('./src/locales', './dist/locales', { recursive: true })

await fs.rm('./dist/locales/i18n.ts')


if (args.includes('--start')) {

  closeTypora()
  child_process.exec('Typora ./test/vault/doc.md')
}
