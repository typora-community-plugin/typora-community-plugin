import path from 'src/path'
import { _options, editor, File, JSBridge } from 'typora'
import decorate from '@plylrnsdy/decorate.js'
import type { App } from 'src/app'
import { Events } from 'src/events'
import fs from 'src/fs/filesystem'
import { Logger } from 'src/logger'


type VaultEvents = {
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

  private _path = File.getMountFolder()
    ?? _options.mountFolder
    ?? path.dirname(_options.initFilePath ?? File.bundle.filePath)

  constructor(private app: App) {
    super()

    this._registerEventHooks()

    app.once('load', () => this._emitMissingEvent())
  }

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
   * Read json in `configDir`
   *
   * @param filename File name without extension name `.json`
   * @returns JSON Object
   */
  readConfigJson(filename: string, defaultValue: any = {}): any {
    try {
      const configPath = path.join(this.configDir, filename + '.json')
      const text = fs.readTextSync(configPath)
      return JSON.parse(text)
    } catch (error) {
      logger.warn(`Failed to load config "${filename}.json"`)
      return defaultValue
    }
  }

  writeConfigJson(filename: string, config: any) {
    const configPath = path.join(this.configDir, filename + '.json')
    const dirname = path.dirname(configPath)
    return fs
      .access(dirname)
      .catch(() => fs.mkdir(dirname))
      .then(() => fs.writeText(configPath, JSON.stringify(config, null, 2)))
      .catch(error => {
        logger.error(`Failed to save config "${filename}.json".`, error)
      })
  }

  private _emitMissingEvent() {
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

const logger = new Logger(Vault.name)


function hashCode(s: string) {
  return (s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0) + 2147483648).toString(16)
}
