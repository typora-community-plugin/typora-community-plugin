import './notice.scss'
import { View } from 'src/ui/view'
import { html } from 'src/utils/html'


export class NoticeContainer extends View {

  onload() {
    this.containerEl = html`<div class="typ-notice__container"></div>`
    document.body.append(this.containerEl)
  }

  onunload() {
    this.containerEl.remove()
  }
}

export class Notice {

  private el: HTMLElement

  /**
   * @param delay Hide notice after `delay` ms. `delay = 0` will not be hidden.
   */
  constructor(message: string, delay = 5000) {
    this.el = html`<div class="typ-notice">${message}</div>`

    $('.typ-notice__container').append(this.el)

    delay && setTimeout(() => this.hide(), delay)
  }

  set message(msg: string) {
    this.el.innerText = msg
  }

  hide() {
    this.el.remove()
  }
}
