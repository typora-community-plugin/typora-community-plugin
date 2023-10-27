import './setting-item.scss'
import { EditableTable } from 'src/components/editable-table'
import { View } from "src/ui/view"
import { html } from "src/utils/html"
import { noop } from 'src/utils/noop'


type SelectOptions = {
  options: string[]
  selected: string
  onchange: (event: Event & { target: HTMLSelectElement }) => void
}

export class SettingItem extends View {

  /**
   * Contain `name` and `description`.
   */
  info: HTMLElement

  name: HTMLElement

  /**
   * Constrols before `info`.
   */
  controlsPrefix: HTMLElement

  /**
   * Constrols after `info`.
   */
  controls: HTMLElement

  constructor() {
    super()
    this.containerEl = html`<div class="typ-setting-item"></div>`
    this.containerEl.append(
      this.controlsPrefix = html`<div class="typ-setting-controls prefix"></div>`,
      this.info = html`<div class="typ-setting-info"></div>`,
      this.controls = html`<div class="typ-setting-controls postfix"></div>`,
    )
  }

  onunload() {
    this.containerEl.remove()
  }

  addTitle(text: string) {
    this.info.append(
      html`<h3 class="typ-setting-title">${text}</h3>`)
  }

  addName(name: string) {
    this.info.append(
      this.name = html`<div class="typ-setting-name">${name} </div>`)
  }

  /**
   * Add badge to `name` element.
   */
  addBadge(text: string) {
    if (!this.name) {
      this.addName('')
    }
    this.name.append(html` <code>${text}</code>`)
  }

  addDescription(description: string): void
  addDescription(build: (div: HTMLElement) => void): void
  addDescription(param0: string | ((div: HTMLElement) => void)) {
    const el = html`<div class="typ-setting-description"></div>`

    if (typeof param0 === 'string') {
      el.innerText = param0
    } else {
      param0(el)
    }

    this.info.append(el)
  }

  addCheckbox(build: (checkbox: HTMLInputElement) => void) {
    const input = html`<input type="checkbox">` as HTMLInputElement
    build(input)
    this.controlsPrefix.append(input)
  }

  addButton(build: (button: HTMLButtonElement) => void) {
    const button = html`<button class="typ-button"></button>` as HTMLButtonElement
    build(button)
    this.controls.append(button)
  }

  addInput(type: string, build: (input: HTMLInputElement) => void) {
    const input = html`<input type="${type}">` as HTMLInputElement
    build(input)
    this.controls.append(input)
  }

  addText(build: (input: HTMLInputElement) => void) {
    this.addInput('text', build)
  }

  /**
   * @beta
   */
  addSelect(options: SelectOptions): void
  addSelect(build: (input: HTMLSelectElement) => void): void
  addSelect(param0: SelectOptions | ((input: HTMLSelectElement) => void)) {
    const select = html`<select></select>` as HTMLSelectElement

    if (typeof param0 === 'function') {
      param0(select)
    }
    else {
      select.innerHTML = param0.options.map(o => `<option ${o === param0.selected ? 'selected' : ''}>${o}</option>`).join('')

      select.onchange = param0.onchange
    }

    this.controls.append(select)
  }

  addTag(text: string, build?: (el: HTMLElement) => void) {
    const el = html`<div class="typ-tag">${text} </div>`
    build?.(el)
    this.controls.prepend(el)
  }

  addRemovableTag(text: string, onClose: () => void = noop) {
    this.addTag(text, el => {
      el.classList.add('removable')

      $(`<span class="typ-icon typ-close"></span>`)
        .on('click', () => {
          el.remove()
          onClose()
        })
        .appendTo(el)
    })
  }

  /**
   * @beta
   */
  addTable(build: (table: EditableTable<any>) => void) {
    const table = new EditableTable()
    build(table)
    this.addChild(table)
    this.containerEl.append(table.containerEl)
  }
}
