import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, it } from 'node:test'

import { buildScript, importFiles, removeEnv } from '../build.js'
import { distDir, templatesDir } from './helpers.mjs'


function tpl(...segments) {
  return path.join(templatesDir, ...segments)
}

/** [dist file, template file, environment block to strip] */
const DIST_MATRIX = [
  ['install-windows.ps1', ['windows', 'install.ps1'], 'TEST'],
  ['uninstall-windows.ps1', ['windows', 'uninstall.ps1'], 'TEST'],
  ['install-linux.sh', ['install.sh'], 'MACOS'],
  ['uninstall-linux.sh', ['uninstall.sh'], 'MACOS'],
  ['install-macos.sh', ['install.sh'], 'LINUX'],
  ['uninstall-macos.sh', ['uninstall.sh'], 'LINUX'],
]


describe('build: @import expansion', () => {
  it('recursively inlines every imported file', async () => {
    const out = importFiles(tpl('windows', 'install.ps1'))

    assert.ok(!out.includes('# @import'), 'no @import directives should remain')
    assert.ok(out.includes('param ('), 'check: find-home.ps1 inlined')
    assert.ok(out.includes('$typoraHome = $Path'), 'check: find-home.ps1 inlined')
    assert.ok(out.includes('$windowHtmlPathCandiates'), 'check: find-window-html.ps1 inlined')
    assert.ok(out.includes("Get-Content $htmlPath -Raw"), 'check: find-userdata.ps1 inlined')
  })

  it('inlines shell imports', async () => {
    const out = importFiles(tpl('install.sh'))

    assert.ok(!out.includes('# @import'))
    assert.ok(out.includes('typora_home='), 'check: find-home.sh inlined')
    assert.ok(out.includes('window_html_path_candidates='), 'check: find-window-html.sh inlined')
    assert.ok(out.includes('userdata_url='), 'check: find-userdata.sh inlined')
  })
})


describe('build: environment block stripping', () => {
  const sample = [
    'a',
    '# LINUX_START',
    'linux-only',
    '# LINUX_END',
    'b',
    '# MACOS_START',
    'macos-only',
    '# MACOS_END',
    'c',
    '# TEST_START',
    'test-only',
    '# TEST_END',
    '',
  ].join('\n')

  it('removes only the requested block', () => {
    const out = removeEnv(sample, 'MACOS')

    assert.ok(!out.includes('macos-only'))
    assert.ok(out.includes('linux-only'))
    assert.ok(out.includes('test-only'))
  })

  it('removes every occurrence', () => {
    const doubled = `${sample}\n${sample}`
    const out = removeEnv(doubled, 'LINUX')

    assert.ok(!out.includes('linux-only'))
    assert.ok(out.includes('macos-only'))
  })
})


describe('build: dist artifacts match templates', () => {
  for (const [distFile, templateSegments, env] of DIST_MATRIX) {
    it(`${distFile} is up to date`, async () => {
      const expected = buildScript(tpl(...templateSegments), env)
      const actual = await readFile(path.join(distDir, distFile), 'utf8')

      assert.equal(actual, expected, `dist/${distFile} is stale - run "pnpm build" in packages/installer`)
      assert.ok(!actual.includes('# @import'), 'no @import directives in dist')
      assert.ok(!actual.includes(`${env}_START`), `no ${env}_START markers in dist`)
    })
  }

  it('windows scripts carry no TEST-only debugging code', async () => {
    const install = await readFile(path.join(distDir, 'install-windows.ps1'), 'utf8')
    const uninstall = await readFile(path.join(distDir, 'uninstall-windows.ps1'), 'utf8')

    for (const script of [install, uninstall]) {
      assert.ok(!script.includes('TEST_START'))
      assert.ok(!script.includes('Detected window.html path'))
      assert.ok(!script.includes('Detected userData path'))
    }
  })

  it('linux scripts contain only Linux candidates', async () => {
    for (const file of ['install-linux.sh', 'uninstall-linux.sh']) {
      const script = await readFile(path.join(distDir, file), 'utf8')

      assert.ok(script.includes('/usr/share/typora'))
      assert.ok(script.includes('$HOME/.local/share/Typora'))
      assert.ok(!script.includes('/Applications/Typora.app'))
      assert.ok(!script.includes('abnerworks.Typora'))
      assert.ok(!script.includes('MACOS_START'))
    }
  })

  it('macos scripts contain only macOS candidates', async () => {
    for (const file of ['install-macos.sh', 'uninstall-macos.sh']) {
      const script = await readFile(path.join(distDir, file), 'utf8')

      assert.ok(script.includes('/Applications/Typora.app'))
      assert.ok(script.includes('abnerworks.Typora'))
      assert.ok(!script.includes('/usr/share/typora'))
      assert.ok(!script.includes('LINUX_START'))
    }
  })
})
