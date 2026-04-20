import { isDebug } from "./constants"
import { useService } from "./service"
import { noop } from "src/utils"
import type { DisposeFunc } from "src/utils/types"


export type EventListener = (...args: any[]) => any

export type EventDefination = Record<string, EventListener>

type EventMap = Record<string, EventListener[]>

const scopedListeners: Record<string, EventMap> = {}


export class Events<E extends EventDefination> {

  protected _listeners: Record<keyof E, EventListener[]> = {} as any

  constructor(
    protected scope?: string,
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

    this._listeners[event]?.forEach(fn => {
      try {
        fn(...args)
      }
      catch (error) {
        this.logger.error(`${this.scope} @${event as string}\n`, error)
      }
    })
  }

  getEventNames() {
    return Object.keys(this._listeners)
  }
}


export class StickyEvents<E extends EventDefination> extends Events<E> {
  protected _stickyEvents: Record<keyof E, boolean> = {} as any
  protected _lastArgs: Record<keyof E, any[]> = {} as any

  prependListener<K extends keyof E>(event: K, listener: E[K]): DisposeFunc {
    if (this._shouldEmitStickyEvent(event)) {
      this._invokeStickyListener(event, listener)
    }
    return super.prependListener(event, listener)
  }

  on<K extends keyof E>(event: K, listener: E[K]): DisposeFunc {
    if (this._shouldEmitStickyEvent(event)) {
      this._invokeStickyListener(event, listener)
    }
    return super.on(event, listener)
  }

  once<K extends keyof E>(event: K, listener: E[K]): DisposeFunc {
    if (this._shouldEmitStickyEvent(event)) {
      this._invokeStickyListener(event, listener)
      return noop
    }
    return super.once(event, listener)
  }

  private _shouldEmitStickyEvent<K extends keyof E>(event: K) {
    return this._stickyEvents[event] && this._lastArgs[event] !== undefined
  }

  private _invokeStickyListener<K extends keyof E>(event: K, listener: E[K]) {
    const args = this._lastArgs[event]
    if (isDebug()) {
      this.logger.debug(`${this.scope} @${event as string} (Sticky)\n`, ...args)
    }
    try {
      listener(...args)
    } catch (error) {
      this.logger.error(`${this.scope} @${event as string} (Sticky)\n`, error)
    }
  }

  protected emit<K extends keyof E>(event: K, ...args: Parameters<E[K]>) {
    this._lastArgs[event] = args
    super.emit(event, ...args)
  }

  protected setSticky<K extends keyof E>(event: K) {
    this._stickyEvents[event] = true
  }
}


export class PublicEvents<E extends EventDefination> extends Events<E> {

  constructor(scope: string) {
    super(scope)
  }

  public emit<K extends keyof E>(event: K, ...args: Parameters<E[K]>) {
    return super.emit(event, ...args)
  }
}
