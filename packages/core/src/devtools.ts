import * as fs from 'fs'
import * as fsp from 'fs/promises'
import * as path from 'path'
import type { App } from './app'
import { BUILT_IN, WorkspaceRibbon } from './ui/ribbon/workspace-ribbon'
import { ClientCommand, JSBridge } from 'typora'
import { html } from './utils/html'


export function devtools(app: App) {

  if (app.env.PLUGIN_WIN_ID) {
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
    const lockerDir = path.join(app.plugins.globalRootDir, '.lock')
    const winLocker = path.join(lockerDir, `win-${app.env.PLUGIN_WIN_ID}`)
    const ac = new AbortController()

    fsp.access(lockerDir)
      .catch(() => fsp.mkdir(lockerDir))
      .then(() => fsp.writeFile(winLocker, '', 'utf-8'))
      .then(() => fs.watch(winLocker, { signal: ac.signal }, (e) => {
        if (e === 'rename') {
          ac.abort()
          JSBridge.invoke("window.close")
        }
      }))
  }
}
