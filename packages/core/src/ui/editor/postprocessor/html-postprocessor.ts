import { useService } from 'src/common/service'
import { PostProcessor } from "./postprocessor"


const logger = useService('logger', ['HtmlPostProcessor'])


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
    try {
      const elements = this.selector
        ? $(this.selector).toArray()
        : [el]
      elements.forEach(this.process, this)
    }
    catch (error) {
      logger.error(error)
    }
  }

  static from(options: Pick<HtmlPostProcessor, 'selector' | 'process'>) {
    const processor = new HtmlPostProcessor()
    Object.assign(processor, options)
    return processor
  }
}
