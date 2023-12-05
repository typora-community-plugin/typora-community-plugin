import { PostProcessor } from "./postprocessor"


export class HtmlPostProcessor extends PostProcessor {

  private _selector = ''

  get selector() {
    return this._selector
  }

  set selector(value) {
    this._selector = value
  }

  process(el: HTMLElement) {
    throw new Error('Method not implemented.')
  }

  _process(el: HTMLElement) {
    const elements = this.selector
      ? $(this.selector).toArray()
      : [el]
    elements.forEach(this.process, this)
  }

  static from(options: Pick<HtmlPostProcessor, 'selector' | 'process'>) {
    const processor = new HtmlPostProcessor()
    Object.assign(processor, options)
    return processor
  }
}
