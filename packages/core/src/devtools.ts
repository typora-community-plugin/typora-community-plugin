import path from 'src/path'
import { ClientCommand, File, JSBridge, reqnode } from 'typora'
import { globalRootDir } from 'src/common/constants'
import fs from 'src/io/fs/filesystem'
import { BUILT_IN } from 'src/ui/ribbon/workspace-ribbon'
import { html } from 'src/utils'
import { useService } from './common/service'
import { useEventBus } from './common/eventbus'


export function devtools(
  config = useEventBus('config-repository'),
) {

  ClientCommand.toggleDevTools()

  if (File.isNode) {
    createLocker()
  }

  config.once('switch', () => {
    const ribbon = useService('ribbon')

    ribbon.addButton({
      [BUILT_IN]: true,
      group: 'bottom',
      id: 'core.devtools',
      title: 'Devtools',
      icon: html`<div><i class="fa fa-wrench"></i></div>`,
      onclick() {
        JSBridge.invoke("window.toggleDevTools")
      }
    })
  })

  function createLocker() {
    const nodeFs: typeof import('fs') = reqnode('fs')
    const lockerDir = path.join(globalRootDir(), '_lock')
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
