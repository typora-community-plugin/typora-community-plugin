export class View {
  containerEl: HTMLElement

  // biome-ignore lint/suspicious/noThenProperty: jQuery-style chaining API, not a thenable
  then(callback: (el: HTMLElement) => void): this {
    callback(this.containerEl)
    return this
  }
}

export interface Closeable {
  open(): void
  close(): void
}
