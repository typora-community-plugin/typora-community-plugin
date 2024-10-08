import fs from 'node:fs/promises'
import { defineConfig } from 'rollup'
import { babel } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import scss from 'rollup-plugin-scss'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import virtual from '@rollup/plugin-virtual'
import { virtualModules } from 'rollup-plugin-typora'


const packageInfo = JSON.parse(await fs.readFile('./package.json', 'utf8'))

const { compilerOptions } = JSON.parse(await fs.readFile('./tsconfig.json', 'utf8'))

const overrided = {
  "target": "ES5",
  "downlevelIteration": true,

  "module": undefined,
  "emitDeclarationOnly": undefined,
  "declaration": undefined,
  "declarationDir": undefined,
}

await fs.rm('./dist', { recursive: true, force: true })

await fs.cp('./src/locales', './dist/locales', { recursive: true })
await fs.rm('./dist/locales/i18n.ts')

export default defineConfig({
  input: 'src/core.ts',
  output: {
    file: 'dist/core.js',
    format: 'iife',
  },
  plugins: [
    replace({
      preventAssignment: true,
      'process.env.CORE_NS': '"typora-plugin-core@v2"',
      'process.env.CORE_VERSION': `"${packageInfo.version}"`,
      'process.env.IS_PROD': 'true',
      'process.env.IS_DEV': 'false',
      'process.env.IS_TEST': 'false',
      'process.env.BUILD_TIME': `"${new Date().toLocaleString('zh-cn')}"`,
    }),
    virtual({ typora: virtualModules.typora }),
    nodeResolve(),
    commonjs(),
    typescript({
      compilerOptions: {
        ...compilerOptions,
        ...overrided,
      },
    }),
    babel({
      babelHelpers: 'bundled',
      presets: [["@babel/preset-env", { "useBuiltIns": "entry", "corejs": 3 }]],
      exclude: [
        /\bcore-js\b/,
      ],
    }),
    scss({
      fileName: 'core.css',
      processor: (css, map) => ({ css: css.replace(/\n+\s*/g, '') }),
    }),
    terser(),
  ],
})
