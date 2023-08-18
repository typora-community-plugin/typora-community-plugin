import * as events from 'events'
import type { DisposeFunc } from "src/utils/types"


export class Events<E extends Record<string, (...args: any[]) => any>> {

  protected _events = new events.EventEmitter()

  prependListener<K extends keyof E>(event: K, listener: E[K]): DisposeFunc {
    this._events.prependListener(event as string, listener)
    return () => this.off(event, listener)
  }

  on<K extends keyof E>(event: K, listener: E[K]): DisposeFunc {
    this._events.on(event as string, listener)
    return () => this.off(event, listener)
  }

  once<K extends keyof E>(event: K, listener: E[K]): DisposeFunc {
    this._events.once(event as string, listener)
    return () => this.off(event, listener)
  }

  off<K extends keyof E>(event: K, listener: E[K]) {
    this._events.off(event as string, listener)
  }

  protected emit<K extends keyof E>(event: K, ...args: Parameters<E[K]>) {
    try {
      this._events.emit(event as string, ...args)
    }
    catch (error) {
      console.error(error)
    }
  }
}
