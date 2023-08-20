import * as _ from "lodash"
import type { App } from "../app"


interface SettingsOption {
  /**
   * Filename relative to typora config folder `.typora`
   */
  filename: string
  version: string
}

interface SettingsFile<T> {
  version: string
  settings: T
}

type SettingsListeners<T> = Record<
  keyof T,
  Array<(key: keyof T, value: T[keyof T]) => void>
>

export class Settings<T extends Record<string, any>> {

  filename: string

  get version() {
    return this._stores.version
  }

  set version(value: string) {
    this._stores.version = value
  }

  private _stores = { settings: {} } as SettingsFile<T>
  private _listeners = {} as SettingsListeners<T>
  private _migation = {} as Record<string, () => void>

  constructor(app: App, filename: string)
  constructor(app: App, options: SettingsOption)
  constructor(private app: App, options: string | SettingsOption) {
    if (typeof options === 'string') {
      this.filename = options
      this.version = app.coreVersion
    }
    else {
      this.filename = options.filename
      this.version = options.version
    }

    this.load()
  }

  get<K extends keyof T>(key: K): T[K] {
    return this._stores.settings[key]
  }

  setDefault<T extends object>(settings: T) {
    this._stores.settings = Object.assign({}, settings, this._stores.settings)
  }

  set<K extends keyof T>(key: K, value: T[K]) {
    this._stores.settings[key] = value
    this._listeners[key]?.forEach(fn => fn(key, value))
    this.save()
  }

  addChangeListener<K extends keyof T>(
    key: K,
    listener: (key: K, value: T[K]) => void
  ) {
    if (!this._listeners[key]) {
      this._listeners[key] = []
    }
    this._listeners[key].push(listener)
    return () => this.removeChangeListener(key, listener)
  }

  /**
   * Alias of `addChangeListener()`
   */
  onChange = this.addChangeListener

  removeChangeListener<K extends keyof T>(
    key: K,
    listener: (key: K, value: T[K]) => void
  ) {
    this._listeners[key] = this._listeners[key].filter(fn => fn !== listener)
  }

  load() {
    this._stores = this.app.vault.readConfigJson(this.filename, {
      version: this.version,
      settings: {}
    })
    while (this._migation[this.version]) {
      this._migation[this.version]()
    }
  }

  private _save = () => {
    this.app.vault.writeConfigJson(this.filename, this._stores)
  }

  save = _.debounce(this._save, 1e3)

  migare(
    oldVersion: string,
    newVersion: string,
    transform: (oldStores: SettingsFile<any>) => any
  ) {
    this._migation[oldVersion] = () => {
      this._stores = transform(this._stores)
      this._stores.version = newVersion
    }
    return this
  }

}
