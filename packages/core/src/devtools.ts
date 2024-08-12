import path from 'src/path'
import { ClientCommand, File, JSBridge, reqnode } from 'typora'
import type { App } from 'src/app'
import fs from 'src/io/fs/filesystem'
import { BUILT_IN } from 'src/ui/ribbon/workspace-ribbon'
import { html } from 'src/utils/html'


export function devtools(app: App) {

  ClientCommand.toggleDevTools()

  if (File.isNode) {
    createLocker()
  }

  app.once('load', () => {
    addDevtoolsRibbon()
  })

  function addDevtoolsRibbon() {
    app.workspace.ribbon.addButton({
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
    const lockerDir = path.join(app.plugins.globalRootDir, '_lock')
    const winLocker = path.join(lockerDir, 'win-test')
    const ac = new AbortController()

    fs.access(lockerDir)
      .catch(() => fs.mkdir(lockerDir))
      .then(() => fs.writeText(winLocker, ''))
      .then(() => nodeFs.watch(winLocker, { signal: ac.signal }, (e) => {
        if (e === 'rename') {
          ac.abort()
          JSBridge.invoke("window.close")
        }
      }))
  }
}
