import fs from 'node:fs/promises'
import { defineConfig } from 'rollup'
import { babel } from '@rollup/plugin-babel'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import scss from 'rollup-plugin-scss'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import virtual from '@rollup/plugin-virtual'


const { compilerOptions } = JSON.parse(await fs.readFile('./tsconfig.json', 'utf8'))

const overrided = {
  "target": "ES5",
  "module": undefined,
  "emitDeclarationOnly": undefined,
  "declaration": undefined,
  "declarationDir": undefined,
}

await fs.rm('./dist', { recursive: true, force: true })

await fs.cp('./src/locales', './dist/locales', { recursive: true })
await fs.rm('./dist/locales/i18n.ts')

export default defineConfig({
  input: 'src/app.ts',
  output: {
    file: 'dist/core.js',
    format: 'cjs'
  },
  plugins: [
    virtual({
      typora: ['_options', 'bridge', 'ClientCommand', 'debugMode', 'File', 'editor', 'JSBridge', 'reqnode']
        .map(o => `export const ${o} = window.${o};`)
        .join('')
    }),
    typescript({
      compilerOptions: {
        ...compilerOptions,
        ...overrided,
      },
    }),
    babel({
      babelHelpers: 'bundled',
      presets: ["@babel/preset-env"],
    }),
    nodeResolve(),
    scss({
      fileName: 'core.css',
      outputStyle: 'compressed',
    }),
    terser(),
  ],
})