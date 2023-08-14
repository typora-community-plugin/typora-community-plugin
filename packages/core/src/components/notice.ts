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

  constructor(message: string, delay = 3000) {
    this.el = html`<div class="typ-notice">${message}</div>`

    $('.typ-notice__container').append(this.el)

    setTimeout(() => this.el.remove(), delay)
  }

  set message(msg: string) {
    this.el.innerText = msg
  }
}
