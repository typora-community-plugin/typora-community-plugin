import type { ConfigStorage } from "src/fs/config-storage"
import { debounce } from "src/utils/debounce"
import { noop } from "src/utils/noop"
import type { DisposeFunc } from "src/utils/types"


export interface SettingsOptions {
  /**
   * Filename relative to typora config folder `.typora`
   */
  filename: string
  /**
   * Settings file's structure version.
   * Increasing it after breaking change. And need to use `migare()` to upgrade it.
   */
  version: number
  migations?: SettingMigrations
}

interface SettingsFile<T> {
  version: number
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

  set version(value: number) {
    this._stores.version = value
  }

  private _stores = { settings: {} } as SettingsFile<T>
  private _listeners = {} as SettingsListeners<T>
  private _migations: SettingMigrations | null

  constructor(private vault: ConfigStorage, options: SettingsOptions) {
    this.filename = options.filename
    this.version = options.version
    this._migations = options.migations

    this.load()
  }

  get<K extends keyof T>(key: K): T[K] {
    if (typeof key !== 'string') {
      throw new TypeError('`key` must be a string.')
    }
    return this._stores.settings[key]
  }

  setDefault<T extends object>(settings: T) {
    this._stores.settings = Object.assign({}, settings, this._stores.settings)
  }

  set<K extends keyof T>(key: K, value: T[K]) {
    if (this._stores.settings[key] === value) return
    this._stores.settings[key] = value
    this._listeners[key]?.forEach(fn => fn(key, value))
    this.save()
  }

  addChangeListener<K extends keyof T>(
    key: K,
    listener: (key: K, value: T[K]) => void
  ): DisposeFunc {
    if (!this._listeners[key]) {
      this._listeners[key] = []
    }
    if (this._listeners[key].includes(listener)) {
      return noop
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
    if (!this._listeners[key]) return
    this._listeners[key] = this._listeners[key].filter(fn => fn !== listener)
  }

  load() {
    this._stores = this.vault.readConfigJson(this.filename, {
      version: this.version,
      settings: {}
    })

    if (!this._migations) return

    this._migations.migrate(this)

    if (!this._migations.hasMigrated) return

    this.save()
    this._migations.hasMigrated = false
  }

  private _save = () => {
    this.vault.writeConfigJson(this.filename, this._stores)
  }

  save = debounce(this._save, 1e3)

  migrateTo(newVersion: number, transform: (oldStores: SettingsFile<any>) => any) {
    this._stores = transform(this._stores)
    this.version = newVersion
  }

}

export class SettingMigrations {

  hasMigrated = false

  private _migration = [] as Array<(settings: Settings<any>) => void>

  addMigration(
    oldVersion: number,
    newVersion: number,
    transform: (oldStores: SettingsFile<any>) => any
  ) {
    this._migration[oldVersion] = (settings) => {
      settings.migrateTo(newVersion, transform)
    }
    return this
  }

  migrate(settings: Settings<any>) {
    while (this._migration[settings.version]) {
      this._migration[settings.version](settings)
      this.hasMigrated = true
    }
  }
}
