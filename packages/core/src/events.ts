import type { DisposeFunc } from "src/utils/types"


type EventListener = (...args: any[]) => any
export class Events<E extends Record<string, EventListener>> {

  protected _listeners = {} as Record<keyof E, EventListener[]>

  prependListener<K extends keyof E>(event: K, listener: E[K]): DisposeFunc {
    let listeners = this._listeners[event]
      ?? (this._listeners[event] = [])

    listeners.unshift(listener)
    return () => this.off(event, listener)
  }

  on<K extends keyof E>(event: K, listener: E[K]): DisposeFunc {
    let listeners = this._listeners[event]
      ?? (this._listeners[event] = [])

    listeners.push(listener)
    return () => this.off(event, listener)
  }

  once<K extends keyof E>(event: K, listener: E[K]): DisposeFunc {
    const onceListener = ((...args: any[]) => {
      listener(...args)
      this.off(event, onceListener)
    }) as E[K]

    this.on(event, onceListener)
    return () => this.off(event, onceListener)
  }

  off<K extends keyof E>(event: K, listener: E[K]) {
    const listeners = this._listeners[event] ?? []
    this._listeners[event] = listeners.filter(fn => fn !== listener)
  }

  protected emit<K extends keyof E>(event: K, ...args: Parameters<E[K]>) {
    try {
      this._listeners[event]?.forEach(fn => fn(...args))
    }
    catch (error) {
      console.error(error)
    }
  }
}
