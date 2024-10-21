import './modal.scss'
import { Closeable, View } from "src/ui/common/view"
import { html } from 'src/utils'


interface ModalProps {
  className?: string
}

export class Modal extends View implements Closeable {

  modal: HTMLElement
  header?: HTMLElement
  body: HTMLElement
  footer?: HTMLElement

  private closeListeners: Array<() => void> = []

  constructor(props: ModalProps) {
    super()

    this.containerEl =
      $('<div class="typ-modal__wrapper middle stopselect" style="display: none;"></div>')
        .on('click', event => {
          if (event.target !== this.containerEl) return
          this.close()
        })
        .on('keyup', event => {
          if (event.key !== "Escape") return
          this.close()
        })
        .append(this.modal =
          $(`<div class="typ-modal ${props.className ?? ''}"></div>`)
            .append(this.body =
              html`<div class="typ-modal__body"></div>`
            )
            .get(0),
        )
        .get(0)

    document.body.append(this.containerEl)
  }

  setHeader(text: string) {
    if (!this.header) {
      this.header = html`<div class="typ-modal__header">${text}</div>`
      this.modal.prepend(this.header)
    }
    else {
      this.header.textContent = text
    }
    return this
  }

  setBody(build: (body: HTMLElement) => void) {
    build(this.body)
    return this
  }

  setFooter(build: (footer: HTMLElement) => void) {
    if (!this.footer) {
      this.footer = html`<div class="typ-modal__footer"></div>`
      this.modal.append(this.footer)
    }
    else {
      this.footer.innerHTML = ""
    }

    build(this.footer)
    return this
  }

  onClose(callback: () => void) {
    this.closeListeners.push(callback)
    return this
  }

  open() {
    this.containerEl.style.display = ""
  }

  close() {
    this.closeListeners.forEach(callback => callback())
    this.containerEl.style.display = "none"
  }
}
