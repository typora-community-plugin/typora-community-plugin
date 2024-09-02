import { Component } from 'src/common/component'
import './notice.scss'
import { Closeable, View } from 'src/ui/common/view'
import { html } from 'src/utils'


class NoticeContainer extends Component implements Closeable {

  containerEl: HTMLElement

  onload() {
    this.containerEl = html`<div class="typ-notice__container" style="display: none;"></div>`
    document.body.append(this.containerEl)
  }

  onunload() {
    this.containerEl.remove()
  }

  open() {
    this.containerEl.style.display = 'block'
  }

  close() {
    if (this.containerEl.children.length > 0) return
    this.containerEl.style.display = 'none'
  }
}

export const noticeContainer = new NoticeContainer()

export class Notice extends View {

  /**
   * @param delay Hide notice after `delay` ms. `delay = 0` will not be hidden.
   */
  constructor(message: string, delay = 5000) {
    super()
    this.containerEl = html`<div class="typ-notice">${message}</div>`

    noticeContainer.containerEl.append(this.containerEl)
    noticeContainer.open()

    delay && setTimeout(() => this.close(), delay)
  }

  set message(msg: string) {
    this.containerEl.innerText = msg
  }

  close() {
    this.containerEl.remove()
    noticeContainer.close()
  }
}
