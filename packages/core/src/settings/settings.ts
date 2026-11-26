import { useService } from "src/common/service"
import { debounced, Store } from "src/utils"


export interface SettingsOptions {
  /**
   * Filename relative to typora config folder `.typora`
   */
  filename: string
  /**
   * Settings file's structure version.
   * Increasing it after breaking change. And need to use `migrate()` to upgrade it.
   */
  version: number
  migrations?: SettingMigrations
}

interface SettingsFile<T> {
  version: number
  settings: T
}


export class Settings<T extends Record<string, any>>
  extends Store<T> {

  private _settingsDir!: string
  private get _isSettingsLoaded() {
    return this._settingsDir === this.config.configDir
  }

  filename: string

  get version() {
    return this._fileVersion
  }

  private _codeVersion = 0
  private _fileVersion = 0
  private _defaultSettings = {} as T
  private _migrations: SettingMigrations | undefined
  private _lastSavedText = ''

  constructor(
    options: SettingsOptions,
    private logger = useService('logger', ['Settings']),
    private config = useService('config-repository')
  ) {
    super()
    this.filename = options.filename
    this._codeVersion = options.version
    this._fileVersion = options.version
    this._migrations = options.migrations

    this._data = Object.create(this._defaultSettings)
    this.addChangeListener('*', () => this.save())
    this.load()
  }

  setDefault<T extends object>(settings: T) {
    Object.assign(this._defaultSettings, settings)
  }

  load() {
    if (this._isSettingsLoaded) {
      return
    }
    else {
      this._settingsDir = this.config.configDir
    }

    const oldSettings = this._data
    const rawStores = this.config.readConfigJson(this.filename, {
      version: this._codeVersion,
      settings: {},
    })
    this._fileVersion = rawStores.version

    this._data = Object.assign(
      Object.create(this._defaultSettings),
      rawStores.settings
    )
    // Loading must not persist anything. This snapshot also lets `save()`
    // skip writes whose content has not changed.
    this._lastSavedText = this._serialize()

    Object.keys(this._defaultSettings).forEach((key: keyof T) => {
      if (this._data[key] === oldSettings[key]) return
      this._emit(key, this._data[key])
    })

    if (this._fileVersion < this._codeVersion) {
      this._migrations?.migrate(this)
      if (this._migrations?.hasMigrated) {
        this.save()
        this._migrations.hasMigrated = false
      }
    }
  }

  private _serialize() {
    return JSON.stringify({ version: this._fileVersion, settings: this._data }, null, 2)
  }

  @debounced(1e3)
  save() {
    const text = this._serialize()
    if (text === this._lastSavedText) return

    this.logger.debug(`Saving settings to ${this.filename}.json`)
    const result = this.config.writeConfigJson(
      this.filename,
      { version: this._fileVersion, settings: this._data }
    )

    if (result && typeof result.then === 'function') {
      result.then((saved: boolean) => {
        // Keep the snapshot unchanged when the write was cancelled, so a later
        // change can retry instead of silently dropping the settings.
        if (saved !== false) this._lastSavedText = text
      }, () => { })
    }
    else {
      this._lastSavedText = text
    }
  }

  migrateTo(newVersion: number, transform: (oldStores: SettingsFile<any>) => any) {
    const result = transform({ version: this._fileVersion, settings: this._data })
    this._fileVersion = newVersion
    this._data = result.settings
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
