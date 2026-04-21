import './notice.scss'
import { Component } from 'src/common/component'
import { useService } from 'src/common/service'
import { Closeable, View } from 'src/ui/common/view'
import { html } from 'src/utils'


/** @private */
class NoticeContainer extends Component implements Closeable {

  containerEl: HTMLElement
  notices: Notice[] = []

  constructor() {
    super()

    setTimeout(() => {
      const commands = useService('command-manager')
      const { t } = useService('i18n')
      this.register(
        commands.register({
          id: 'core.notice:clear-all',
          title: t.notice.clearAll,
          scope: 'global',
          callback: () => this.clearAll(),
        }))
    }, 167)
  }

  /** @private */
  onload() {
    this.containerEl = html`<div class="typ-notice__container" style="display: none;"></div>`
    document.body.append(this.containerEl)
  }

  /** @private */
  onunload() {
    this.containerEl.remove()
  }

  add(notice: Notice) {
    this.notices.push(notice);
  }
  remove(notice: Notice) {
    this.notices = this.notices.filter(item => item !== notice);
  }

  clearAll() {
    [...this.notices].forEach(notice => notice.close());
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


interface NoticeOptions {
  type?: 'success' | 'warning' | 'error'
  duration?: number
}

export class Notice extends View {

  /**
   * @param duration Hide notice after `duration` ms. `duration = 0` will not be hidden.
   */
  constructor(message: string, duration?: number)
  constructor(message: string, options?: NoticeOptions)
  constructor(message: string, options?: number | NoticeOptions) {
    super()

    const duration = (typeof options === 'number' ? options : options.duration) ?? 5000
    const type = (<any>options).type ?? 'info'

    this.containerEl = $(`<div class="typ-notice ${type}"></div>`)
      .append(`<div class="typ-notice__content">${message}</div>`)
      .append($('<div class="typ-notice__close"><i class="typ-icon typ-close"></i></div>')
        .on('click', () => this.close()))
      .get(0)

    this.show();

    (duration > 0) && setTimeout(() => this.close(), duration)
  }

  /**
   * @deprecated Use `setMessage` instead.
   */
  set message(msg: string) {
    this.containerEl.innerText = msg
  }

  setMessage(msg: string) {
    this.message = msg
    return this
  }

  /**
   * @deprecated Notices should always be closable.
   */
  setCloseable(closeable: boolean) {
    return this
  }

  show() {
    noticeContainer.containerEl.append(this.containerEl)
    noticeContainer.add(this)
    noticeContainer.open()
    requestAnimationFrame(() => this.containerEl.classList.add('show'))
  }

  close() {
    this.containerEl.remove()
    noticeContainer.remove(this)
    noticeContainer.close()
  }
}

