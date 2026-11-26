import decorate from '@plylrnsdy/decorate.js'
import { useEventBus } from 'src/common/eventbus'
import { Events } from 'src/common/events'
import { useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import path from 'src/path'
import { _options, editor, File, JSBridge } from 'typora'


export type VaultEvents = {
  /** be emitted when first mount or change folder */
  'mounted'(path: string): void
  /** be emitted when change folder */
  'change'(path: string): void

  'directory:rename'(oldPath: string, newPath: string): void

  'file:create'(path: string): void
  'file:delete'(path: string): void
  'file:rename'(oldPath: string, newPath: string): void
}


/**
 * Mounted folder
 */
export class Vault extends Events<VaultEvents> {

  constructor(
    app = useEventBus('app'),
    protected logger = useService('logger', ['Vault'])
  ) {
    super('vault')

    app.once('load', () => this._emitMissingEvents())

    this._registerEventHooks()
  }

  private _path = resolveVaultPath()

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

  private _emitMissingEvents() {
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

    // Renames are reported separately from the file-system watcher. Suppress
    // the watcher events for both paths so they are not reported as a
    // delete/create pair.
    const renamedFrom = new Set<string>()
    const renamedTo = new Set<string>()

    if (File.isNode) {
      decorate.afterCall(JSBridge, 'invoke', async (args) => {
        if ("app.sendEvent" === args[0] && "didRename" === args[1]) {
          const { oldPath, newPath } = args[2]
          const type = (await fs.isDirectory(newPath)) ? 'directory' : 'file'
          renamedFrom.add(oldPath)
          renamedTo.add(newPath)
          this.emit(`${type}:rename`, oldPath, newPath)
          setTimeout(() => {
            renamedFrom.delete(oldPath)
            renamedTo.delete(newPath)
          }, 333)
        }
      })

      decorate.afterCall(editor.library.fileTree, 'onRemoveFile', ([file]) => {
        if (typeof file === 'string' && !renamedFrom.has(file)) {
          this.emit('file:delete', file)
        }
      })

      decorate.afterCall(editor.library.fileTree, 'onChangeForWin', ([filePath, , type]) => {
        // Windows passes no `type`; Unix passes the raw `fs.watch` event.
        // The tree handler also runs for deletes/renames and content changes,
        // so only report paths that currently exist as files.
        if (typeof filePath !== 'string') return
        if (type === 'change' || type === 'unlink') return
        if (renamedFrom.has(filePath) || renamedTo.has(filePath)) return

        fs.isFile(filePath)
          .then(isFile => {
            if (isFile) this.emit('file:create', filePath)
          })
          .catch(() => { })
      })
    }
    else {
      decorate.afterCall(editor.library, 'onFileChanges', ([events]) => {
        events.forEach(event => {
          if (event.type === 'rename') {
            const type = event.isDir ? 'directory' : 'file'
            this.emit(`${type}:rename`, event.oldPath, event.newPath)
          }
          else if (event.type === 'created' && !event.isDir) {
            this.emit('file:create', event.path)
          }
          else if (event.type === 'removed') {
            this.emit('file:delete', event.path)
          }
          return [event]
        })
      })
    }
  }
}

/**
 * Resolve the mounted folder.
 *
 * Typora reports an empty string (instead of `undefined`) when no folder is
 * mounted and no document is loaded. Passing it to `path.dirname()` would yield
 * `.` (or `/` on macOS), making the plugin operate on the process working
 * directory. Normalize such "no vault" states to `''` so consumers can detect
 * them with a falsy check.
 */
export function resolveVaultPath(): string {
  const mountFolder = File.getMountFolder?.() || _options.mountFolder
  if (mountFolder) return mountFolder

  const filePath = _options.initFilePath || File.filePath || File.bundle?.filePath
  return filePath ? path.dirname(filePath) : ''
}

function hashCode(s: string) {
  return (s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0) + 2147483648).toString(16)
}
