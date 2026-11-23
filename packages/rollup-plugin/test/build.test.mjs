import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, it } from 'node:test'
import url from 'node:url'

import {
  CORE_ENTRY,
  CORE_EXPORTS,
  collectExportedNames,
  extractTyporaExports,
  TYPORA_EXPORTS,
  TYPORA_TYPES,
} from '../build.js'


const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const packageDir = path.resolve(__dirname, '..')
const readFromPackage = file => readFile(path.join(packageDir, file), 'utf8')
const readJSON = async file => JSON.parse(await readFromPackage(file))

const collect = code => collectExportedNames(code, 'test.ts')


describe('collectExportedNames: export lists', () => {
  it('collects a single named export', () => {
    assert.deepEqual(collect(`export { Component } from './common/component'`), ['Component'])
  })

  it('collects every name of a multi-specifier export', () => {
    const code = `export { ExportProcessor, HtmlExportProcessor, CodeblockExportProcessor } from './export-manager'`

    assert.deepEqual(collect(code), ['CodeblockExportProcessor', 'ExportProcessor', 'HtmlExportProcessor'])
  })

  it('collects aliased exports by their public name', () => {
    assert.deepEqual(collect(`export { ViewLegacy as View } from './ui/common/view-legacy'`), ['View'])
  })

  it('collects `default as` exports', () => {
    assert.deepEqual(collect(`export { default as fs } from 'src/io/fs/filesystem'`), ['fs'])
  })

  it('handles export lists split over multiple lines', () => {
    const code = [
      'export {',
      '  Alpha,',
      '  Beta as Gamma,',
      '} from \'./package\'',
    ].join('\n')

    assert.deepEqual(collect(code), ['Alpha', 'Gamma'])
  })

  it('deduplicates and sorts names', () => {
    const code = [
      `export { Beta, Alpha } from './a'`,
      `export { Beta } from './b'`,
    ].join('\n')

    assert.deepEqual(collect(code), ['Alpha', 'Beta'])
  })
})


describe('collectExportedNames: type-only exports', () => {
  it('skips `export type { ... }` statements', () => {
    const code = [
      `export type { App } from './app'`,
      `export { Events } from './common/events'`,
    ].join('\n')

    assert.deepEqual(collect(code), ['Events'])
  })

  it('skips inline `type` specifiers', () => {
    assert.deepEqual(collect(`export { type App, Events } from './x'`), ['Events'])
  })
})


describe('collectExportedNames: declarations', () => {
  it('collects `export declare` variables, functions and classes', () => {
    const code = [
      'export declare const app: App',
      'export declare let counter: number',
      'export declare var legacy: string',
      'export declare function start(): void',
      'export declare class Node {}',
      'export declare enum Mode { A, B }',
    ].join('\n')

    assert.deepEqual(collect(code), ['Mode', 'Node', 'app', 'counter', 'legacy', 'start'])
  })
})


describe('collectExportedNames: comments', () => {
  it('ignores `export` inside comments', () => {
    const code = [
      `// export { Ghost } from './ghost'`,
      `/* export const ghost = 1 */`,
      `export { Real } from './real'`,
    ].join('\n')

    assert.deepEqual(collect(code), ['Real'])
  })
})


describe('collectExportedNames: errors', () => {
  it('rejects `export * from` instead of silently dropping names', () => {
    assert.throws(
      () => collect(`export * from './everything'`),
      /cannot be resolved statically/,
    )
  })

  it('rejects unsupported export statements', () => {
    assert.throws(
      () => collect(`export default function main() {}`),
      /unsupported `export` statement/,
    )
  })

  it('rejects invalid exported names', () => {
    assert.throws(
      () => collect(`export { not-an-identifier } from './x'`),
      /invalid exported name/,
    )
  })

  it('rejects modules without exported values', () => {
    assert.throws(
      () => collect(`export type { App } from './app'`),
      /no exported names found/,
    )
  })
})


describe('extractTyporaExports', () => {
  it('collects declared global variables and functions', () => {
    const code = [
      'export declare var _options: {}',
      'export declare const editor: Editor',
      'export declare let debugMode: boolean',
      'export declare function getMarkdown(): string',
      'export interface NotAGlobal {}',
    ].join('\n')

    assert.deepEqual(extractTyporaExports(code), ['_options', 'debugMode', 'editor', 'getMarkdown'])
  })
})


describe('generated exported-by-core.json', () => {
  it('matches the current src/index.ts', async () => {
    const names = collectExportedNames(await readFromPackage(CORE_ENTRY), CORE_ENTRY)

    assert.deepEqual(names, await readJSON(CORE_EXPORTS))
  })

  it('contains the runtime exports that the old regex dropped', async () => {
    const names = await readJSON(CORE_EXPORTS)

    for (const name of ['ExportProcessor', 'HtmlExportProcessor', 'CodeblockExportProcessor', 'StatisticContext', 'View']) {
      assert.ok(names.includes(name), `missing ${name}`)
    }
  })

  it('does not contain type-only exports', async () => {
    const names = await readJSON(CORE_EXPORTS)

    assert.ok(!names.includes('StatisticHandler'))
  })
})


describe('generated exported-by-typora.json', () => {
  it('matches the current types/index.d.ts', async () => {
    const names = extractTyporaExports(await readFromPackage(TYPORA_TYPES))

    assert.deepEqual(names, await readJSON(TYPORA_EXPORTS))
  })
})
