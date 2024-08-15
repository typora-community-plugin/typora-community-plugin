import path from 'src/path'
import { _options, editor, File, JSBridge } from 'typora'
import decorate from '@plylrnsdy/decorate.js'
import { Events } from 'src/common/events'
import { useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import { _emitMissingEvents } from 'src/symbols'


export type VaultEvents = {
  /** be emitted when first mount or change folder */
  'mounted'(path: string): void
  /** be emitted when change folder */
  'change'(path: string): void

  'directory:rename'(oldPath: string, newPath: string): void

  // 'file:create'(path: string): void
  'file:delete'(path: string): void
  'file:rename'(oldPath: string, newPath: string): void
}


/**
 * Mounted folder
 */
export class Vault extends Events<VaultEvents> {

  constructor(
    protected logger = useService('logger', ['Vault'])
  ) {
    super('vault')

    this._registerEventHooks()
  }

  private _path = File.getMountFolder()
    ?? _options.mountFolder
    ?? path.dirname(_options.initFilePath ?? File.bundle.filePath)

  get id() {
    return hashCode(this.path)
  }

  get path() {
    return this._path
  }

  get configDir() {
    return path.join(this.path, '.typora')
  }

  get dataDir() {
    return path.join(this.configDir, 'data')
  }

  /**
   * @private
   */
  [_emitMissingEvents]() {
    if (this.path) {
      this.emit('mounted', this.path)
    }
  }

  private _registerEventHooks() {
    decorate.afterCall(File, 'setMountFolder', ([folder]) => {
      if (this._path !== folder) {
        this._path = folder

        this.emit('mounted', folder)
        this.emit('change', folder)
      }
    })

    File.isNode
      ? decorate.afterCall(JSBridge, 'invoke', async (args) => {
        if ("app.sendEvent" === args[0] && "didRename" === args[1]) {
          const { oldPath, newPath } = args[2]
          const type = (await fs.stat(newPath)).isDirectory() ? 'directory' : 'file'
          this.emit(`${type}:rename`, oldPath, newPath)
        }
        else if ('shell.trashItem' === args[0]) {
          this.emit('file:delete', args[1])
        }
      })
      : decorate.parameters(editor.library, 'onFileChanges', ([arg0]) => {
        if (arg0.type === 'rename') {
          const type = arg0.isDir ? 'directory' : 'file'
          this.emit(`${type}:rename`, arg0.oldPath, arg0.newPath)
        }
        else if (arg0.type === 'removed') {
          this.emit('file:delete', arg0.path)
        }
        return [arg0]
      })
  }
}

function hashCode(s: string) {
  return (s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0) + 2147483648).toString(16)
}
