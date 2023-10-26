import * as path from 'path'
import type { App } from './app'
import { BUILT_IN, WorkspaceRibbon } from './ui/ribbon/workspace-ribbon'
import fs from './vault/filesystem'
import { html } from './utils/html'
import { ClientCommand, File, JSBridge, reqnode } from 'typora'


export function devtools(app: App) {

  if (app.env.PLUGIN_WIN_ID && File.isNode) {
    createLocker()
  }

  app.once('load', () => {
    if (app.env.TYPORA_EXTENSION_ENV === 'development') {
      ClientCommand.toggleDevTools()
      addDevtoolsRibbon()
    }
  })

  function addDevtoolsRibbon() {
    app.workspace.getViewByType(WorkspaceRibbon)!
      .addButton({
        [BUILT_IN]: true,
        group: 'bottom',
        id: 'core.devtools',
        title: 'Devtools',
        icon: html`<div><i class="fa fa-wrench"></i></div>`,
        onclick() {
          JSBridge.invoke("window.toggleDevTools")
        }
      })
  }

  function createLocker() {
    const nodeFs: typeof import('fs') = reqnode('fs')
    const lockerDir = path.join(app.plugins.globalRootDir, '.lock')
    const winLocker = path.join(lockerDir, `win-${app.env.PLUGIN_WIN_ID}`)
    const ac = new AbortController()

    fs.exists(lockerDir)
      .catch(() => fs.mkdir(lockerDir))
      .then(() => fs.write(winLocker, ''))
      .then(() => nodeFs.watch(winLocker, { signal: ac.signal }, (e) => {
        if (e === 'rename') {
          ac.abort()
          JSBridge.invoke("window.close")
        }
      }))
  }
}
