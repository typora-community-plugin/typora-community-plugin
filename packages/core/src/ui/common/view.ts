export class View {
  containerEl: HTMLElement

  then(callback: (el: HTMLElement) => void): this {
    callback(this.containerEl)
    return this
  }
}

export interface Closeable {
  open(): void
  close(): void
}
