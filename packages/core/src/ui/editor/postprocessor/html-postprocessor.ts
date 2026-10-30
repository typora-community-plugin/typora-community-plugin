import { useService } from 'src/common/service'
import { PostProcessor } from "./postprocessor"
import type { PostProcessorContext } from "./postprocessor"


export class HtmlPostProcessor extends PostProcessor {

  constructor(
    protected logger = useService('logger', ['HtmlPostProcessor'])
  ) {
    super()
  }

  private _selector = ''

  get selector() {
    return this._selector
  }

  set selector(value) {
    this._selector = value
  }

  process(el: HTMLElement, context: PostProcessorContext) {
    throw new Error('Method not implemented.')
  }

  _process(el: HTMLElement) {
    const elements = this.selector
      ? $(this.selector, el).toArray()
      : [el]

    elements.forEach(selected => {
      try {
        this.process(selected, { containerEl: el })
      }
      catch (error) {
        this.logger.error(error)
      }
    }, this)
  }

  static from(options: Pick<HtmlPostProcessor, 'selector' | 'process'>) {
    const processor = new HtmlPostProcessor()
    Object.assign(processor, options)
    return processor
  }
}
