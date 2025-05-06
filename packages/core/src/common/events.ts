import { isDebug } from "./constants"
import { useService } from "./service"
import type { DisposeFunc } from "src/utils/types"


type EventListener = (...args: any[]) => any

type EventDefination = Record<string, EventListener>

type EventMap = Record<string, EventListener[]>

const scopedListeners: Record<string, EventMap> = {}

export class Events<E extends EventDefination> {

  protected _listeners: Record<keyof E, EventListener[]> = {} as any

  constructor(
    private scope?: string,
    protected logger = useService('logger', ['Events'])
  ) {
    if (scope) {
      if (scopedListeners[scope]) {
        this._listeners = scopedListeners[scope] as any
      }
      else {
        scopedListeners[scope] = this._listeners
      }
    }
  }

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

    if (isDebug()) {
      this.logger.debug(`${this.scope} @${event as string}\n`, ...args)
    }

    try {
      this._listeners[event]?.forEach(fn => fn(...args))
    }
    catch (error) {
      this.logger.error(`${this.scope} @${event as string}\n`, error)
    }
  }

  getEventNames() {
    return Object.keys(this._listeners)
  }
}
