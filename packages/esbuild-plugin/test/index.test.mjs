import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, describe, it } from 'node:test'

import * as esbuild from 'esbuild'

import typoraPlugin from '../index.js'


const plugin = typoraPlugin()

let onLoadOptions
let onLoad

plugin.setup({
  onLoad(options, callback) {
    onLoadOptions = options
    onLoad = callback
  },
})

let workDir

after(async () => {
  if (workDir) await rm(workDir, { recursive: true, force: true })
})

/** Run the plugin's `onLoad` hook against a real file and return `{ loader, contents }`. */
async function loadSource(fileName, code) {
  workDir ??= await mkdtemp(path.join(tmpdir(), 'typora-esbuild-plugin-'))
  const file = path.join(workDir, fileName)

  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, code)

  return onLoad({ path: file })
}

const transform = async (code, fileName = 'main.ts') => (await loadSource(fileName, code)).contents


describe('typoraPlugin: plugin contract', () => {
  it('exposes the esbuild plugin name', () => {
    assert.equal(plugin.name, 'typora-plugin')
  })

  it('registers a single onLoad hook', () => {
    assert.equal(typeof onLoad, 'function')
    assert.ok(onLoadOptions.filter instanceof RegExp)
  })

  it('handles JavaScript and TypeScript sources only', () => {
    const { filter } = onLoadOptions

    for (const file of ['main.js', 'main.jsx', 'main.ts', 'main.tsx']) {
      assert.ok(filter.test(file), `should handle ${file}`)
    }
    for (const file of ['main.css', 'main.scss', 'manifest.json']) {
      assert.ok(!filter.test(file), `should ignore ${file}`)
    }
  })

  it('passes the file extension as the loader', async () => {
    const matrix = [
      ['main.js', 'js'],
      ['main.jsx', 'jsx'],
      ['main.ts', 'ts'],
      ['main.tsx', 'tsx'],
    ]

    for (const [fileName, loader] of matrix) {
      const result = await loadSource(fileName, 'export const a = 1')

      assert.equal(result.loader, loader)
    }
  })
})


describe('typoraPlugin: node_modules', () => {
  it('copies third-party code inside node_modules untouched', async () => {
    const code = [
      `import fs from 'fs'`,
      `import { Plugin } from '@typora-community-plugin/core'`,
      `require('path')`,
    ].join('\n')

    const { contents } = await loadSource('node_modules/some-package/index.ts', code)

    assert.equal(contents, code)
  })

  it('still transforms plugin sources outside node_modules', async () => {
    const { contents } = await loadSource('src/main.ts', `const fs = require('fs')`)

    assert.equal(contents, `const fs = reqnode('fs')`)
  })
})


describe('transform: CommonJS', () => {
  it('rewrites require() to reqnode()', async () => {
    assert.equal(
      await transform(`const fs = require('fs')`),
      `const fs = reqnode('fs')`,
    )
  })
})


describe('transform: TypeScript types', () => {
  it('removes type-only imports', async () => {
    assert.equal(
      await transform(`import type { App } from './app'`),
      '',
    )
  })

  it('removes type-only imports ending with a semicolon', async () => {
    assert.equal(
      await transform(`import type { App } from './app';`),
      '',
    )
  })

  it('keeps value specifiers of a partial import with types', async () => {
    assert.equal(
      await transform(`import { type App, Events } from './common/events'`),
      `const {Events} = await import('./common/events')`,
    )
  })

  it('removes a partial import when every specifier is a type', async () => {
    assert.equal(
      await transform(`import { type App } from './app'`),
      '',
    )
  })

  it('removes locale language imports', async () => {
    assert.equal(
      await transform(`import zh from './locales/lang.zh-cn.json'`),
      '',
    )
  })
})


describe('transform: typora globals', () => {
  it('drops named imports from typora', async () => {
    assert.equal(
      await transform(`import { Editor } from 'typora'`),
      '',
    )
  })

  it('drops default imports from typora', async () => {
    assert.equal(
      await transform(`import typora from 'typora'`),
      '',
    )
  })
})


describe('transform: ESM imports', () => {
  it('maps default imports of builtin modules', async () => {
    assert.equal(
      await transform(`import fs from 'fs'`),
      `const { default: fs } = reqnode("fs")`,
    )
  })

  it('maps namespace imports of builtin modules', async () => {
    assert.equal(
      await transform(`import * as nodePath from 'path'`),
      `const nodePath = reqnode("path")`,
    )
  })

  it('maps named imports of builtin modules', async () => {
    assert.equal(
      await transform(`import { join } from 'path'`),
      `const { join } = reqnode("path")`,
    )
  })

  it('maps default imports of third-party modules to dynamic import', async () => {
    assert.equal(
      await transform(`import something from 'not-a-typora-module'`),
      `const { default: something } = await import('not-a-typora-module')`,
    )
  })

  it('maps named imports of third-party modules to dynamic import', async () => {
    assert.equal(
      await transform(`import { other } from 'also-not-a-typora-module'`),
      `const { other } = await import('also-not-a-typora-module')`,
    )
  })

  it('resolves the core module from the window namespace symbol', async () => {
    assert.equal(
      await transform(`import { Plugin } from '@typora-community-plugin/core'`),
      `const { Plugin } = window[Symbol.for("typora-plugin-core@v2")]`,
    )
  })
})


describe('transform: modules bundled with Typora', () => {
  it('maps a default import to the internal package path', async () => {
    assert.equal(
      await transform(`import yauzl from 'yauzl'`),
      `const { default: yauzl } = reqnode("extract-zip/node_modules/yauzl")`,
    )
  })

  it('maps a nested dependency to the internal package path', async () => {
    assert.equal(
      await transform(`import mkdirp from 'mkdirp'`),
      `const { default: mkdirp } = reqnode("extract-zip/node_modules/mkdirp")`,
    )
  })

  it('maps a module exposed through another package', async () => {
    assert.equal(
      await transform(`import lodash from 'lodash'`),
      `const { default: lodash } = reqnode("lowdb/node_modules/lodash")`,
    )
  })
})


describe('typoraPlugin: esbuild integration', () => {
  it('builds a plugin entry with the rewritten modules', async () => {
    const entry = await loadSource('entry/main.ts', [
      `import { join } from 'path'`,
      `import { Plugin } from '@typora-community-plugin/core'`,
      `import type { App } from './app'`,
      ``,
      `export const p = join('a', 'b')`,
      `export const plugin = Plugin`,
    ].join('\n'))

    const { outputFiles } = await esbuild.build({
      entryPoints: [path.join(workDir, 'entry/main.ts')],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'neutral',
      plugins: [plugin],
    })

    assert.equal(entry.loader, 'ts')

    const code = outputFiles[0].text
    assert.match(code, /reqnode\(["']path["']\)/)
    assert.match(code, /Symbol\.for\(["']typora-plugin-core@v2["']\)/)
    assert.ok(!code.includes('./app'), 'type-only import should be stripped')
    assert.ok(!code.includes('@typora-community-plugin/core'), 'core should be resolved by the plugin')
  })
})
