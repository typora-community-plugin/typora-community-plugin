import { Modal } from "../components/modal"
import { html } from 'src/utils'
import { useService } from 'src/common/service'
import { Component } from 'src/common/component'


// @ts-ignore
globalThis.openInputBox = openInputBox
// @ts-ignore
globalThis.openQuickPick = openQuickPick

interface InputBoxOptions {
  title?: string;
  placeholder?: string;
  prompt?: string;
}

export function openInputBox(options?: InputBoxOptions): Promise<string | undefined> {
  const inputBox = useService('input-box')
  return new Promise(resolve => {
    inputBox.open(resolve, options)
  })
}

interface QuickPickItem {
  label: string;
  // description?: string;
  // details?: string;
}

interface QuickPickBaseOptions {
  title?: string;
  placeholder?: string;
  // onDidSelectItem?: (item: I) => void;
}

interface QuickPickManyOptions extends QuickPickBaseOptions {
  /** @default false */
  canPickMany?: boolean;
}

export function openQuickPick<I extends QuickPickItem>(items: I[], options?: QuickPickBaseOptions): Promise<I | undefined>
export function openQuickPick<I extends QuickPickItem>(items: I[], options?: QuickPickManyOptions): Promise<I[] | undefined>
export function openQuickPick<I extends QuickPickItem>(items: I[], options?: Record<string, any>): Promise<any | undefined> {
  const quickPick = useService('quick-pick')
  return new Promise(resolve => {
    quickPick.open(resolve, items, options)
  })
}

export class InputBox extends Component {

  private modal: Modal

  private input: HTMLInputElement

  private options: InputBoxOptions
  private resolve: (result: any) => void
  private resolved: boolean = false

  constructor(
    private markdownEditor = useService('markdown-editor'),
  ) {
    super()
  }

  onload() {
    this.render()
    super.onload()
  }

  open(resolve: (result: any) => void, options: InputBoxOptions = {}) {
    this.resolve = resolve
    this.resolved = false
    this.options = options

    $(this.modal.containerEl)
      .find('.typ-command-modal__title')
      .text(options.title ?? '')
      .end()
      .find('.typ-command-modal__form input')
      .attr('placeholder', this.options.placeholder ?? '')
      .end()
      .find('.typ-command-modal__prompt')
      .text(options.prompt ?? '')

    this.modal.open()
    this.markdownEditor.selection.save()
    this.input.focus()
  }

  close() {
    if (!this.resolved) {
      this.resolve(undefined)
    }
    this.resolve = undefined

    this.input.value = ""
    this.markdownEditor.selection.restore()
  }

  private render() {
    this.modal = new Modal({ className: 'typ-command-modal' })
      .onClose(() => this.close())
      .setBody(body => {
        $(body)
          .on('keyup', this.onKeyup as any)
          .append(
            html`<div class="typ-command-modal__title"></div>`,
            $('<div class="typ-command-modal__form"></div>')
              .append(this.input =
                html`<input type="text" />` as any),
            html`<div class="typ-command-modal__prompt"></div>`,
          )
      })
  }

  private onKeyup = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        this.resolve(this.input.value)
        this.resolved = true
        this.close()
        this.modal.close()
        break
    }
  }
}

export class QuickPick extends Component {

  private modal: Modal

  private input: HTMLInputElement
  private results: HTMLElement

  private items: QuickPickItem[] = []
  private filteredItems: QuickPickItem[] = []
  private selected = -1
  private picked: Record<number, QuickPickItem> = {}

  private options: QuickPickManyOptions

  private resolve: (result: any) => void
  private resolved: boolean = false

  constructor(
    private markdownEditor = useService('markdown-editor'),
  ) {
    super()
  }

  onload() {
    this.render()
    super.onload()
  }

  open(
    resolve: (result: any) => void,
    items: QuickPickItem[],
    options: QuickPickManyOptions = {}
  ) {
    this.items = items
    this.options = options
    this.resolve = resolve
    this.resolved = false

    $(this.modal.containerEl)
      .find('.typ-command-modal__title')
      .text(options.title ?? '')
      .end()
      .find('.typ-command-modal__form input')
      .attr('placeholder', options.placeholder ?? '')
      .end()
      .find('.typ-command-modal__form button')
      .css('display', options.canPickMany ? '' : 'none')

    this.filteredItems = items
    this.renderItems()
    this.modal.open()
    this.markdownEditor.selection.save()
    this.input.focus()
  }

  private closePickMany() {
    const res = Object.values(this.picked)
    this.resolve(res.length ? res : undefined)
    this.resolved = true
    this.close()
    this.modal.close()
  }

  close() {
    if (!this.resolved) {
      this.resolve(undefined)
    }
    this.items = []
    this.resolve = undefined

    this.input.value = ""
    this.selected = -1
    this.picked = {}
    this.markdownEditor.selection.restore()
  }

  private render() {
    this.modal = new Modal({ className: 'typ-command-modal' })
      .onClose(() => this.close())
      .setBody(body => {
        $(body)
          .on('keyup', this.onKeyup as any)
          .append(
            html`<div class="typ-command-modal__title"></div>`,
            $('<div class="typ-command-modal__form"></div>')
              .append(this.input =
                html`<input type="text" />` as any,
                $(`<button class="typ-button primary">OK</button>`)
                  .on('click', () => this.closePickMany())
              )
          )
          .append(this.results =
            $('<div class="typ-command-modal__results stopselect"></div>')
              .on('click', this.onItemClick as any)
              .get(0)
          )
      })
  }

  private onKeyup = (event: KeyboardEvent) => {
    let { key } = event;
    if (key.startsWith("Arrow")) {
      if (key === "ArrowDown") {
        if (this.selected < this.filteredItems.length - 1) {
          this.selected++
        } else {
          this.selected = 0
        }
      } else if (key === "ArrowUp") {
        if (this.selected > 0) {
          this.selected--
        } else {
          this.selected = this.filteredItems.length - 1
        }
      }
      this.renderItems()
      return
    }
    if (key === "Enter") {
      this.onSelect(this.selected)
      return
    }
    this.selected = -1
    this.filteredItems = this.items.filter((c) =>
      c.label.toLowerCase().includes(this.input.value.toLowerCase())
    )
    this.renderItems()
  }

  private renderItems() {
    this.results.innerHTML = ''
    this.results.append(...this.filteredItems.map((item, i) => {
      const active = (i === this.selected) ? 'active' : ''
      return $(`<div class="typ-command-modal__item ${active}" data-index=${i}>${item.label}</div>`)
        .prepend(this.options.canPickMany ? `<input type="checkbox" ${this.picked[i] ? 'checked' : ''}> ` : '')
        .get(0)
    }))
  }

  private onItemClick = (event: MouseEvent) => {
    const el = event.target as HTMLElement
    const item = el.closest(".typ-command-modal__item") as HTMLElement
    if (!item) return

    this.onSelect(+item.dataset.index)
  }

  private onSelect = (index: number) => {
    if (this.options.canPickMany) {
      $(this.modal.containerEl)
        .find('.typ-command-modal__item input').eq(index)
        .prop('checked', !this.picked[index])

      if (this.picked[index]) {
        delete this.picked[index]
      } else {
        this.picked[index] = this.filteredItems[index]
      }
      return
    }

    this.resolve(this.filteredItems[index])
    this.resolved = true
    this.close()
    this.modal.close()
  }
}
