import './modal.scss'
import { View } from "../ui/view"
import { html } from '../utils/html'


export class Modal extends View {

  modal: HTMLElement
  header?: HTMLElement
  body: HTMLElement
  footer?: HTMLElement

  onload() {
    this.containerEl = html`<div class="typ-modal__wrapper middle stopselect" style="display: none;"></div>`
    this.containerEl.addEventListener('click', event => {
      if (event.target !== this.containerEl) return
      this.hide()
    })
    this.containerEl.addEventListener('keyup', event => {
      if (event.key !== "Escape") return
      this.hide()
    })

    this.modal = html`<div class="typ-modal"></div>`
    this.body = html`<div class="typ-modal__body"></div>`

    this.containerEl.append(this.modal)
    this.modal.append(this.body)

    document.body.append(this.containerEl)
  }

  onunload() {
    this.containerEl.remove()
  }

  addHeader(text: string) {
    this.header = html`<div class="typ-modal__header">${text}</div>`
    this.modal.prepend(this.header)
  }

  addBody(build: (body: HTMLElement) => void) {
    build(this.body)
  }

  addFooter(build: (footer: HTMLElement) => void) {
    this.footer = html`<div class="typ-modal__footer"></div>`
    build(this.footer)
    this.modal.append(this.footer)
  }

  show() {
    this.containerEl.style.display = ""
  }

  hide() {
    this.containerEl.style.display = "none"
  }
}
