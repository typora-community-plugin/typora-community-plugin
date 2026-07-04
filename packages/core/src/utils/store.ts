import { noop } from "./function/noop"
import type { DisposeFunc } from "./types"


type StorePath = string[]
type StorePathKey = string


export class Store<T extends Record<string, any>> {

  protected _data = {} as T
  protected _listeners = {} as Record<StorePathKey | '*', Array<(key: string | string[], value: any) => void>>

  constructor(data?: T) {
    if (data) {
      this._data = Object.create(data)
    }
  }

  get(key: keyof T | string[]): any {
    if (typeof key !== 'string' && !Array.isArray(key)) {
      throw new TypeError('`key` must be a string | string[].')
    }
    const parts = typeof key === 'string' ? [key] : key
    return _getPathValue(this._data, parts)
  }

  /**
   * @tips If the `value` does not change, it will not trigger an update.
   * @tips If the `value` is an **object type**, the same reference will not trigger an update.
   *       You can use a nested key (like `['a', 'b']`) to trigger an update.
   */
  set(key: keyof T | string[], value: any) {
    const isStringKey = typeof key === 'string'
    if (!isStringKey && !Array.isArray(key)) {
      throw new TypeError('`key` must be a string | string[].')
    }
    if (this.get(key) === value) return
    const parts = isStringKey ? [key] : key
    _setPathValue(this._data, parts, value)
    this._emit(isStringKey ? key : parts, value)
  }

  protected _emit<K extends keyof T>(key: K | string[], value: T[K]) {
    const keyPath = _normalizeToPathKey(key as string | string[])
    for (const k of [keyPath, '*'] as string[]) {
      this._listeners[k]?.forEach(fn => {
        try { fn(key as string | string[], value) }
        catch (error) {
          console.error(`Store :${k.toString()}=${value} failed to call a listener.\n`, error)
        }
      })
    }
  }

  addChangeListener<K extends keyof T>(key: string[] | '*', listener: (key: K | string[], value: T[keyof T]) => void): DisposeFunc
  addChangeListener<K extends keyof T>(key: K, listener: (key: K, value: T[K]) => void): DisposeFunc
  addChangeListener<K extends keyof T>(
    key: K | string[] | '*',
    listener: (key: keyof T, value: T[keyof T]) => void
  ): DisposeFunc {
    const keyPath = _normalizeToPathKey(key as string | string[])
    if (!this._listeners[keyPath]) {
      this._listeners[keyPath] = []
    }
    if (this._listeners[keyPath].includes(listener as any)) {
      return noop
    }
    this._listeners[keyPath].push(listener as any)
    return () => this.removeChangeListener(key as any, listener)
  }

  /**
   * Alias of `addChangeListener()`
   */
  onChange = this.addChangeListener

  removeChangeListener<K extends keyof T>(key: string[] | '*', listener: (key: K | string[], value: T[keyof T]) => void): void
  removeChangeListener<K extends keyof T>(key: K, listener: (key: K, value: T[K]) => void): void
  removeChangeListener<K extends keyof T>(
    key: K | string[] | '*',
    listener: (key: K | string[], value: any) => void
  ) {
    const keyPath = _normalizeToPathKey(key as string | string[])
    if (!this._listeners[keyPath]) return
    this._listeners[keyPath] = this._listeners[keyPath].filter(fn => fn !== listener)
  }
}


function _normalizeToPathKey(key: string | string[] | '*'): StorePathKey {
  if (key === '*') return '*'
  if (typeof key === 'string') return key
  return key.join('▪')
}

function _getPathValue(obj: any, parts: string[]) {
  let current: any = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[part]
  }
  return current
}

function _setPathValue(obj: any, parts: string[], value: any) {
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] == null || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {}
    }
    current = current[parts[i]]
  }
  current[parts[parts.length - 1]] = value
}
