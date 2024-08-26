import './modal.scss'
import { View } from "../view"
import { html } from 'src/utils'


export class Modal extends View {

  modal: HTMLElement
  header?: HTMLElement
  body: HTMLElement
  footer?: HTMLElement

  onload() {
    this.containerEl =
      $('<div class="typ-modal__wrapper middle stopselect" style="display: none;"></div>')
        .on('click', event => {
          if (event.target !== this.containerEl) return
          this.hide()
        })
        .on('keyup', event => {
          if (event.key !== "Escape") return
          this.hide()
        })
        .append(this.modal =
          $(`<div class="typ-modal"></div>`)
            .append(this.body =
              html`<div class="typ-modal__body"></div>`
            )
            .get(0),
        )
        .get(0)

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
