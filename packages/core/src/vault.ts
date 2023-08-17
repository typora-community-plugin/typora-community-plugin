import * as fs from 'fs'
import * as fsp from 'fs/promises'
import * as mkdirp from 'mkdirp'
import * as path from 'path'
import { _options, File, JSBridge } from 'typora'
import { Events } from './events'
import decorate from '@plylrnsdy/decorate.js'
import type { App } from './app'


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
    ?? path.dirname(_options.initFilePath)

  constructor(private app: App) {
    super()

    this.initConfigDir()
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

  initConfigDir() {
    mkdirp.sync(this.dataDir)
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
      const text = fs.readFileSync(configPath, 'utf8')
      return JSON.parse(text)
    } catch (error) {
      console.warn(`Failed to load config "${filename}.json"`)
      return defaultValue
    }
  }

  writeConfigJson(filename: string, config: any) {
    const configPath = path.join(this.configDir, filename + '.json')
    const dirname = path.dirname(configPath)
    return fsp
      .access(dirname)
      .catch(() => fsp.mkdir(dirname, { recursive: true }))
      .then(() => fsp.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8'))
      .catch(error => console.error(`Failed to save config "${filename}.json"\n`, error))
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

    decorate.afterCall(JSBridge, 'invoke', (args) => {
      if ("app.sendEvent" === args[0] && "didRename" === args[1]) {
        const { oldPath, newPath } = args[2]
        const type = fs.statSync(newPath).isDirectory() ? 'directory' : 'file'
        this.emit(`${type}:rename`, oldPath, newPath)
      }
      else if ('shell.trashItem' === args[0]) {
        this.emit('file:delete', args[1])
      }
    })
  }

}


function hashCode(s: string) {
  return (s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0) + 2147483648).toString(16)
}
