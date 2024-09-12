import type { DisposeFunc } from "src/utils/types"


export interface Loadable {
  load(): void
  unload(): void
}

export class Component implements Loadable {

  protected _loaded = false
  protected _disposables: DisposeFunc[] = []
  protected _children: Loadable[] = []

  load() {
    if (this._loaded) {
      return
    }

    this.onload()
    this._children.forEach(child => child.load())
    this._loaded = true
  }

  unload() {
    if (!this._loaded) {
      return
    }

    this.onunload()
    this._disposables.forEach(dispose => dispose())
    this._disposables = []
    this._children.forEach(child => child.unload())
    this._children = []
    this._loaded = false
  }

  onload() { }

  onunload() { }

  addChild(component: Loadable) {
    this._children.push(component)
    if (this._loaded) {
      component.load()
    }
    return () => this.removeChild(component)
  }

  removeChild(component: Loadable) {
    component.unload()
    this._children = this._children.filter(c => c !== component)
  }

  register(disposable: DisposeFunc) {
    this._disposables.push(disposable)
  }

  unregister(disposable: DisposeFunc) {
    disposable?.()
    this._disposables = this._disposables.filter(d => d !== disposable)
  }

  registerDomEvent(
    target: EventTarget,
    event: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions
  ) {
    target.addEventListener(event, listener, options)
    this.register(() => target.removeEventListener(event, listener, options))
  }

  registerInterval(intervalId: number) {
    this.register(() => clearInterval(intervalId))
  }
}
