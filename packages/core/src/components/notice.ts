import './notice.scss'
import { View } from 'src/ui/view'
import { html } from 'src/utils/html'


class NoticeContainer extends View {

  onload() {
    this.containerEl = html`<div class="typ-notice__container"></div>`
    this.hide()
    document.body.append(this.containerEl)
  }

  onunload() {
    this.containerEl.remove()
  }

  show() {
    this.containerEl.style.display = 'block'
  }

  hide() {
    if (this.containerEl.children.length > 0) return
    this.containerEl.style.display = 'none'
  }
}

export const noticeContainer = new NoticeContainer()

export class Notice {

  private el: HTMLElement

  /**
   * @param delay Hide notice after `delay` ms. `delay = 0` will not be hidden.
   */
  constructor(message: string, delay = 5000) {
    this.el = html`<div class="typ-notice">${message}</div>`

    noticeContainer.containerEl.append(this.el)
    noticeContainer.show()

    delay && setTimeout(() => this.hide(), delay)
  }

  set message(msg: string) {
    this.el.innerText = msg
  }

  hide() {
    this.el.remove()
    noticeContainer.hide()
  }
}
