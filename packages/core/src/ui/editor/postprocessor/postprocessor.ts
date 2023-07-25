import './postprocessor.scss'
import { randomString } from "src/utils/random-string"


export type ButtonMouseEventListener<T> = (event: MouseEvent & { target: HTMLElement }, context: T) => void

export interface ButtonOptions<T = any> {
  text: string,
  title?: string,
  className?: string,
  onclick: ButtonMouseEventListener<T>
}

export type RawProcessor = (el: HTMLElement) => void

export class PostProcessor {

  _process(el: HTMLElement) {
    try {
      this.process(el)
    } catch (e) {
      console.error(e)
    }
  }

  process(el: HTMLElement) {
    throw new Error('Method not implemented.')
  }

  renderButton(parent: HTMLElement, button: ButtonOptions) {
    const className = button.className ??= 'typ-btn_' + randomString()
    const group = this.setupButtonContainer(parent)
    if (group.getElementsByClassName(className).length) {
      return
    }

    const buttonEl = document.createElement('button')
    buttonEl.classList.add('typ-block-operate-button', className)
    buttonEl.innerHTML = button.text
    buttonEl.title = button.title ?? ''
    buttonEl.onclick = (event: any) => button.onclick(event, {})

    group.append(buttonEl)
  }

  setupButtonContainer(codeblock: HTMLElement) {
    let group = codeblock.querySelector('.typ-buttons')
    if (group) return group

    group = document.createElement('div')
    group.className = 'typ-buttons'
    group.addEventListener('mouseup', event => event.stopPropagation())
    codeblock.append(group)

    return group
  }

  static from(options: RawProcessor | Pick<PostProcessor, 'process'>): PostProcessor {
    const processor = new PostProcessor()
    if (typeof options === 'function') {
      processor.process = options
    }
    else {
      Object.assign(processor, options)
    }
    return processor
  }
}

