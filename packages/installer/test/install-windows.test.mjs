import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, lstat, realpath } from 'node:fs/promises'
import path from 'node:path'

import {
  distDir,
  findLoaderTags,
  hasUtf8Bom,
  loaderSrcs,
  makeWindowsSandbox,
  pwsh,
  runWindowsScript,
} from './helpers.mjs'


const installScript = path.join(distDir, 'install-windows.ps1')
const uninstallScript = path.join(distDir, 'uninstall-windows.ps1')

const APP_USERDATA_SRC = 'typora://app/userData/plugins/loader.js'
const USERDATA_SRC = 'typora://userData/plugins/loader.js'

const skip = pwsh ? false : 'pwsh is not available'

async function readHtml(sandbox) {
  return readFile(sandbox.windowHtml, 'utf8')
}

describe('installer/windows', { skip }, () => {
  it('W1: installs into a clean window.html containing typora://app/userData', async t => {
    const sb = await makeWindowsSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    const res = await runWindowsScript(installScript, sb)
    const html = await readHtml(sb)

    assert.equal(res.exitCode, 0, res.stderr)
    assert.match(res.stdout, /Installation succeeded/)
    assert.deepEqual(loaderSrcs(html), [APP_USERDATA_SRC])
    assert.ok(
      html.includes(`<script src="${APP_USERDATA_SRC}" type="module"></script></body>`),
      'loader tag must sit right before </body>',
    )
  })

  it('W2: installs into a clean window.html containing typora://userData (Typora 1.1)', async t => {
    const sb = await makeWindowsSandbox('window.clean.userdata.html')
    t.after(sb.cleanup)

    const res = await runWindowsScript(installScript, sb)
    const html = await readHtml(sb)

    assert.equal(res.exitCode, 0, res.stderr)
    assert.deepEqual(loaderSrcs(html), [USERDATA_SRC])
  })

  it('W3: repeated installs stay idempotent (regression: duplicate loader injection)', async t => {
    const sb = await makeWindowsSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    for (let i = 0; i < 3; i++) {
      const res = await runWindowsScript(installScript, sb)
      assert.equal(res.exitCode, 0, res.stderr)

      const html = await readHtml(sb)
      assert.equal(findLoaderTags(html).length, 1, `run #${i + 1} produced duplicate loader tags`)
      assert.deepEqual(loaderSrcs(html), [APP_USERDATA_SRC])
    }
  })

  it('W4: cleans up malformed duplicate tags left by the old installer', async t => {
    const sb = await makeWindowsSandbox('window.legacy-duplicates.html')
    t.after(sb.cleanup)

    assert.equal(findLoaderTags(sb.originalHtml).length, 3, 'fixture precondition')

    const res = await runWindowsScript(installScript, sb)
    const html = await readHtml(sb)

    assert.equal(res.exitCode, 0, res.stderr)
    assert.equal(findLoaderTags(html).length, 1)
    assert.deepEqual(loaderSrcs(html), [APP_USERDATA_SRC])
    assert.ok(!html.includes('typora://userData/plugins/loader.js typora'), 'space-joined src must be gone')
    assert.ok(html.includes('window.reqnode'), 'unrelated content preserved')
  })

  it('W5: re-installing over an installed page is a no-op', async t => {
    const sb = await makeWindowsSandbox('window.installed.html')
    t.after(sb.cleanup)

    const res = await runWindowsScript(installScript, sb)

    assert.equal(res.exitCode, 0, res.stderr)
    assert.equal(await readHtml(sb), sb.originalHtml, 'file must not be rewritten')
    assert.ok(!res.stdout.includes('Editing File'))
  })

  it('W6: appends the tag when </body> is missing', async t => {
    const sb = await makeWindowsSandbox('window.no-body.html')
    t.after(sb.cleanup)

    const res = await runWindowsScript(installScript, sb)
    const html = await readHtml(sb)

    assert.equal(res.exitCode, 0, res.stderr)
    assert.deepEqual(loaderSrcs(html), [APP_USERDATA_SRC])
    assert.ok(html.trimEnd().endsWith(`<script src="${APP_USERDATA_SRC}" type="module"></script>`))
  })

  it('W7: fails without touching the file when the userData URL is missing', async t => {
    const sb = await makeWindowsSandbox('window.no-userdata.html')
    t.after(sb.cleanup)

    const res = await runWindowsScript(installScript, sb)

    assert.notEqual(res.exitCode, 0)
    assert.match(res.stdout, /Could not detect the Typora userData URL scheme/)
    assert.equal(await readHtml(sb), sb.originalHtml, 'file must stay untouched')
  })

  it('W8: writes UTF-8 without BOM', async t => {
    const sb = await makeWindowsSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    const res = await runWindowsScript(installScript, sb)
    const buf = await readFile(sb.windowHtml)

    assert.equal(res.exitCode, 0, res.stderr)
    assert.equal(hasUtf8Bom(buf), false)
    assert.ok(buf.toString('utf8').includes('ABCDEFG'), 'content stays readable as UTF-8')
  })

  it('W9: links userData/plugins and copies the plugin files', async t => {
    const sb = await makeWindowsSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    const res = await runWindowsScript(installScript, sb)
    assert.equal(res.exitCode, 0, res.stderr)

    const pluginsPath = path.join(sb.profile, 'AppData', 'Roaming', 'Typora', 'plugins')
    assert.equal((await lstat(pluginsPath)).isSymbolicLink(), true, 'plugins must be a junction')
    assert.equal(await realpath(pluginsPath), await realpath(sb.community))

    const copied = await readdir(sb.community)
    assert.ok(copied.includes('install-windows.ps1'))
    assert.ok(copied.includes('uninstall-windows.ps1'))
  })

  it('W10: preserves CRLF line endings', async t => {
    const sb = await makeWindowsSandbox('window.clean.app-userdata.html', { crlf: true })
    t.after(sb.cleanup)

    const res = await runWindowsScript(installScript, sb)
    const html = await readHtml(sb)

    assert.equal(res.exitCode, 0, res.stderr)
    assert.equal(findLoaderTags(html).length, 1)
    assert.ok(html.includes('\r\n'), 'CRLF must survive the rewrite')
    assert.ok(!html.replace(/\r\n/g, '').includes('\n'), 'no bare LF must be introduced')
  })

  it('U1: uninstall restores the original window.html and removes the junction', async t => {
    const sb = await makeWindowsSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    assert.equal((await runWindowsScript(installScript, sb)).exitCode, 0)

    const res = await runWindowsScript(uninstallScript, sb)
    const html = await readHtml(sb)

    assert.equal(res.exitCode, 0, res.stderr)
    assert.match(res.stdout, /Uninstallation succeeded/)
    assert.deepEqual(findLoaderTags(html), [])
    assert.equal(html, sb.originalHtml, 'file must be byte-for-byte restored')

    const pluginsPath = path.join(sb.profile, 'AppData', 'Roaming', 'Typora', 'plugins')
    await assert.rejects(() => lstat(pluginsPath), 'junction must be deleted')
  })

  it('U2: uninstall removes legacy malformed duplicates too', async t => {
    const sb = await makeWindowsSandbox('window.legacy-duplicates.html')
    t.after(sb.cleanup)

    const res = await runWindowsScript(uninstallScript, sb)
    const html = await readHtml(sb)

    assert.equal(res.exitCode, 0, res.stderr)
    assert.deepEqual(findLoaderTags(html), [])
    assert.ok(html.includes('window.reqnode'), 'unrelated content preserved')
    assert.ok(html.includes('</body>'), 'document structure preserved')
  })
})
