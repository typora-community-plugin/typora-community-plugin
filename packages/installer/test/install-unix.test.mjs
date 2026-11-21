import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat, mkdir } from 'node:fs/promises'
import path from 'node:path'

import {
  bash,
  findLoaderTags,
  loaderSrcs,
  makeLinuxSandbox,
  runBashScript,
  toPosix,
} from './helpers.mjs'


const APP_USERDATA_SRC = 'typora://app/userData/plugins/loader.js'
const USERDATA_SRC = 'typora://userData/plugins/loader.js'

const skip = bash ? false : 'bash (Git Bash) is not available'

/** Run a dist script shipped inside the sandbox (that is the "plugin source" dir). */
async function runScript(sandbox, scriptName, args) {
  const scriptPath = path.join(sandbox.pluginSrc, scriptName)
  return runBashScript(scriptPath, args ?? ['-p', toPosix(sandbox.typoraHome)], { home: sandbox.home })
}

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

describe('installer/linux (git bash)', { skip }, () => {
  it('L1: installs into a clean window.html containing typora://app/userData', async t => {
    const sb = await makeLinuxSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    const res = await runScript(sb, 'install-linux.sh')
    const html = await readFile(sb.windowHtml, 'utf8')

    assert.equal(res.exitCode, 0, res.stderr)
    assert.match(res.stdout, /Successfully installed Typora Community Plugin\./)
    assert.deepEqual(loaderSrcs(html), [APP_USERDATA_SRC])
    assert.ok(
      html.includes(`<script src="${APP_USERDATA_SRC}" type="module"></script></body>`),
      'loader tag must sit right before </body>',
    )

    assert.ok(await exists(path.join(sb.pluginsPath, 'loader.js')), 'plugin files copied to userData/plugins')
    assert.ok(await exists(path.join(sb.pluginsPath, 'install-linux.sh')))
  })

  it('L2: installs into a clean window.html containing typora://userData (Typora 1.1)', async t => {
    const sb = await makeLinuxSandbox('window.clean.userdata.html')
    t.after(sb.cleanup)

    const res = await runScript(sb, 'install-linux.sh')
    const html = await readFile(sb.windowHtml, 'utf8')

    assert.equal(res.exitCode, 0, res.stderr)
    assert.deepEqual(loaderSrcs(html), [USERDATA_SRC])
  })

  it('L3: repeated installs stay idempotent', async t => {
    const sb = await makeLinuxSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    for (let i = 0; i < 2; i++) {
      const res = await runScript(sb, 'install-linux.sh')
      assert.equal(res.exitCode, 0, res.stderr)

      const html = await readFile(sb.windowHtml, 'utf8')
      assert.equal(findLoaderTags(html).length, 1, `run #${i + 1} produced duplicate loader tags`)
    }
  })

  it('L4: uninstall removes the tag and the plugin directory', async t => {
    const sb = await makeLinuxSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    assert.equal((await runScript(sb, 'install-linux.sh')).exitCode, 0)

    const res = await runScript(sb, 'uninstall-linux.sh')
    const html = await readFile(sb.windowHtml, 'utf8')

    assert.equal(res.exitCode, 0, res.stderr)
    assert.match(res.stdout, /Successfully uninstalled Typora Community Plugin\./)
    assert.deepEqual(findLoaderTags(html), [])
    assert.equal(html, sb.originalHtml, 'file must be restored byte-for-byte')
    assert.equal(await exists(sb.pluginsPath), false, 'plugins directory must be deleted')
  })

  it('L5: uninstall on a clean page leaves the file untouched', async t => {
    const sb = await makeLinuxSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    const res = await runScript(sb, 'uninstall-linux.sh')

    assert.equal(res.exitCode, 0, res.stderr)
    assert.equal(await readFile(sb.windowHtml, 'utf8'), sb.originalHtml)
  })

  it('L6: fails when no Typora home can be found', async t => {
    const sb = await makeLinuxSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    // No -p flag: only the (non-existent) candidate paths remain.
    const res = await runScript(sb, 'install-linux.sh', [])

    assert.notEqual(res.exitCode, 0)
    assert.match(res.stdout, /Can not find Typora home directory\./)
  })

  it('L7: fails when the home exists but window.html does not', async t => {
    const sb = await makeLinuxSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    const emptyHome = path.join(sb.root, 'empty-typora')
    await mkdir(emptyHome, { recursive: true })

    const res = await runScript(sb, 'install-linux.sh', ['-p', toPosix(emptyHome)])

    assert.notEqual(res.exitCode, 0)
    assert.match(res.stdout, /Can not find `window\.html`\./)
  })

  it('L8: rejects unknown arguments', async t => {
    const sb = await makeLinuxSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    const res = await runScript(sb, 'install-linux.sh', ['--nope'])

    assert.notEqual(res.exitCode, 0)
    assert.match(res.stdout, /Unknown parameter passed: --nope/)
    assert.equal(await readFile(sb.windowHtml, 'utf8'), sb.originalHtml)
  })

  it('L9: macOS build keeps macOS paths and userData handling', async t => {
    const sb = await makeLinuxSandbox('window.clean.app-userdata.html')
    t.after(sb.cleanup)

    const script = await readFile(path.join(sb.pluginSrc, 'install-macos.sh'), 'utf8')
    assert.ok(script.includes('/Applications/Typora.app'))
    assert.ok(script.includes('abnerworks.Typora'))
    assert.ok(!script.includes('/usr/share/typora'))
  })
})
