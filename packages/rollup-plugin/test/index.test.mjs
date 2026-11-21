import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'

import { typoraPlugin, virtualModules } from '../index.js'


const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const packageDir = path.resolve(__dirname, '..')
const readJSON = async file => JSON.parse(await readFile(path.join(packageDir, file), 'utf8'))

const coreNames = await readJSON('exported-by-core.json')
const typoraNames = await readJSON('exported-by-typora.json')


describe('virtualModules: typora', () => {
  it('re-exports every global from window', () => {
    const expected = typoraNames
      .map(name => `export const ${name} = window.${name};`)
      .join('')

    assert.equal(virtualModules.typora, expected)
  })
})


describe('virtualModules: core', () => {
  const prefix = 'const exported = window[Symbol.for("typora-plugin-core@v2")];'

  it('reads the namespace object exposed by the core', () => {
    assert.ok(virtualModules['@typora-community-plugin/core'].startsWith(prefix))
  })

  it('re-exports every name from exported-by-core.json', () => {
    const expected = coreNames
      .map(name => `export const ${name} = exported.${name};`)
      .join('')

    assert.equal(virtualModules['@typora-community-plugin/core'], prefix + expected)
  })

  it('binds names that are valid identifiers', () => {
    const source = virtualModules['@typora-community-plugin/core'].slice(prefix.length)
    const bindings = [...source.matchAll(/export const (\w+) = exported\.(\w+);/g)]

    assert.deepEqual(bindings.map(([, name]) => name), coreNames)
  })
})


describe('typoraPlugin: transform', () => {
  const { transform } = typoraPlugin()

  const rewrite = (code, id = '/plugin/src/main.ts') => transform(code, id)?.code

  it('only transforms .ts files', () => {
    assert.equal(transform(`const a = require('a')`, '/plugin/src/main.js'), undefined)
    assert.equal(transform(`const a = require('a')`, '/plugin/src/main.tsx'), undefined)
  })

  it('rewrites require() to reqnode()', () => {
    assert.equal(rewrite(`const fs = require('fs')`), `const fs = reqnode('fs')`)
  })

  it('maps default imports of builtin modules', () => {
    assert.equal(rewrite(`import fs from 'fs'`), `const { default: fs } = reqnode("fs")`)
  })

  it('maps namespace imports of builtin modules', () => {
    assert.equal(rewrite(`import * as nodePath from 'path'`), `const nodePath = reqnode("path")`)
  })

  it('maps named imports of builtin modules', () => {
    assert.equal(rewrite(`import { join } from 'path'`), `const { join } = reqnode("path")`)
  })

  it('maps modules bundled with Typora to their internal path', () => {
    assert.equal(
      rewrite(`import yauzl from 'yauzl'`),
      `const { default: yauzl } = reqnode("extract-zip/node_modules/yauzl")`,
    )
  })

  it('leaves the core module for bundler resolution', () => {
    const source = `import { Plugin } from '@typora-community-plugin/core'`

    assert.equal(rewrite(source), source)
  })

  it('leaves third-party imports untouched', () => {
    const source = [
      `import something from 'not-a-typora-module'`,
      `import { other } from 'also-not-a-typora-module'`,
    ].join('\n')

    assert.equal(rewrite(source), source)
  })
})
