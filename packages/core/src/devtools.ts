import path from 'src/path'
import { ClientCommand, File, JSBridge, reqnode } from 'typora'
import { globalRootDir } from 'src/common/constants'
import fs from 'src/io/fs/filesystem'


export function devtools() {

  ClientCommand.toggleDevTools()

  if (File.isNode) {
    createLocker()
  }

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
