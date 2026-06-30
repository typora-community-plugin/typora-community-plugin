import { noop } from "./function/noop"
import type { DisposeFunc } from "./types"


type StoreListeners<T> = Record<
  keyof T | '*',
  Array<(key: keyof T, value: T[keyof T]) => void>
>


export class Store<T extends Record<string, any>> {

  protected _data = {} as T
  protected _listeners = {} as StoreListeners<T>

  constructor(data?: T) {
    if (data) {
      this._data = Object.create(data)
    }
  }

  get<K extends keyof T>(key: K): T[K] {
    if (typeof key !== 'string') {
      throw new TypeError('`key` must be a string.')
    }
    return this._data[key]
  }

  /**
   * @tips If the `value` does not change, it will not trigger an update.
   * @tips If the `value` is an **object type**, the same reference will not trigger an update.
   */
  set<K extends keyof T>(key: K, value: T[K]) {
    if (this._data[key] === value) return
    this._data[key] = value
    this._emit(key, value)
  }

  protected _emit<K extends keyof T>(key: K, value: T[K]) {
    for (const k of [key, '*'] as (keyof T | '*')[]) {
      this._listeners[k]?.forEach(fn => {
        try { fn(key, value) }
        catch (error) {
          console.error(`Store :${k.toString()}=${value} failed to call a listener.\n`, error)
        }
      })
    }
  }

  addChangeListener<K extends keyof T>(
    key: K | '*',
    listener: (key: keyof T, value: T[keyof T]) => void
  ): DisposeFunc {
    if (!this._listeners[key]) {
      this._listeners[key] = []
    }
    if (this._listeners[key].includes(listener as any)) {
      return noop
    }
    this._listeners[key].push(listener as any)
    return () => this.removeChangeListener(key, listener)
  }

  /**
   * Alias of `addChangeListener()`
   */
  onChange = this.addChangeListener

  removeChangeListener<K extends keyof T>(
    key: K | '*',
    listener: (key: keyof T, value: T[keyof T]) => void
  ) {
    if (!this._listeners[key]) return
    this._listeners[key] = this._listeners[key].filter(fn => fn !== listener)
  }

  /**
   * Serialize store data, converting nested Store instances to plain objects
   * with a type marker.
   */
  static serialize(value: any): any {
    if (value instanceof Store) {
      const serialized: Record<string, any> = { '@@type': 'Store' }
      for (const key of Object.keys(value._data)) {
        serialized[key] = Store.serialize(value._data[key])
      }
      return serialized
    }
    if (Array.isArray(value)) {
      return value.map(item => Store.serialize(item))
    }
    if (value && typeof value === 'object') {
      const serialized: Record<string, any> = {}
      for (const key of Object.keys(value)) {
        serialized[key] = Store.serialize(value[key])
      }
      return serialized
    }
    return value
  }

  /**
   * Deserialize data, restoring nested Store instances from serialized form.
   * Uses the given prototype to determine which fields should be Store instances.
   */
  static deserialize<T extends Record<string, any>>(
    data: any,
    prototype: T
  ): T {
    if (!data || typeof data !== 'object') return data

    const result: any = {}
    for (const key of Object.keys(data)) {
      const defaultValue = prototype[key]
      if (defaultValue instanceof Store && data[key]?.['@@type'] === 'Store') {
        const { '@@type': _, ...storeData } = data[key]
        const nestedPrototype: any = {}
        for (const k of Object.keys(defaultValue._data)) {
          nestedPrototype[k] = defaultValue._data[k]
        }
        result[key] = Store.deserialize(storeData, nestedPrototype)
        if (result[key] && typeof result[key]._emit === 'function') {
          result[key] = Object.assign(defaultValue, result[key])
        }
      }
      else {
        result[key] = Store.deserialize(
          data[key],
          defaultValue && typeof defaultValue === 'object' ? defaultValue : {}
        )
      }
    }
    return result
  }
}
