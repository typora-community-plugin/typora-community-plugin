import * as _ from "lodash"
import type { App } from "../app"


export class Settings<T = any> {

  private _settings = {} as T

  private _listeners = {} as Record<keyof T, Array<(key: keyof T, value: T[keyof T]) => void>>

  private _migation = {} as Record<string, () => void>

  constructor(
    public app: App,
    public name: string,
    public version: string
  ) {
    this.load()
  }

  get<K extends keyof T>(key: K): T[K] {
    return this._settings[key]
  }

  setDefault<T extends object>(settings: T) {
    this._settings = Object.assign({}, settings, this._settings)
  }

  set<K extends keyof T>(key: K, value: T[K]) {
    this._settings[key] = value
    this._listeners[key].forEach(fn => fn(key, value))
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

  onChange = this.addChangeListener

  removeChangeListener<K extends keyof T>(
    key: K,
    listener: (key: K, value: T[K]) => void
  ) {
    this._listeners[key] = this._listeners[key].filter(fn => fn !== listener)
  }

  load() {
    const stores = this.app.vault.readConfigJson(this.name, this.toJSON())
    this.version = stores.$version
    this._settings = stores.$stores
    while (this._migation[this.version]) {
      this._migation[this.version]()
    }
  }

  private _save = () => {
    this.app.vault.writeConfigJson(this.name, this.toJSON())
  }

  save = _.debounce(this._save, 1e3)

  toJSON() {
    return {
      $version: this.version,
      $stores: this._settings,
    }
  }

  migare(
    oldVersion: string,
    newVersion: string,
    transform: (oldStores: any) => any
  ) {
    this._migation[oldVersion] = () => {
      this._settings = transform(this._settings)
      this.version = newVersion
    }
    return this
  }

}
