import './setting-item.scss'
import * as _ from 'lodash'
import { EditableTable } from 'src/components/editable-table'
import { View } from "src/ui/view"
import { html } from "src/utils/html"


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
      this.info = html`<div class="typ-setting-info"></div>`)
  }

  onunload() {
    this.containerEl.remove()
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

  addDescription(description: string) {
    this.info.append(html`<div class="typ-setting-description">${description}</div>`)
  }

  private tryPrependControls() {
    if (this.controlsPrefix) return
    this.containerEl.prepend(
      this.controlsPrefix = html`<div class="typ-setting-controls prefix"></div>`)
  }

  private tryAppendControls() {
    if (this.controls) return
    this.containerEl.append(
      this.controls = html`<div class="typ-setting-controls postfix"></div>`)
  }

  addCheckbox(build: (checkbox: HTMLInputElement) => void) {
    this.tryPrependControls()
    const input = html`<input type="checkbox">` as HTMLInputElement
    build(input)
    this.controlsPrefix.append(input)
  }

  addButton(build: (button: HTMLButtonElement) => void) {
    this.tryAppendControls()
    const button = html`<button class="typ-button"></button>` as HTMLButtonElement
    build(button)
    this.controls.append(button)
  }

  addInput(type: string, build: (input: HTMLInputElement) => void) {
    this.tryAppendControls()
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
  addSelect(options: SelectOptions) {
    this.tryAppendControls()
    const el = html`<select>${options.options.map(o => `<option ${o === options.selected ? 'selected' : ''}>${o}</option>`).join('')}</select>` as HTMLSelectElement
    el.onchange = options.onchange
    this.controls.append(el)
  }

  /**
   * @deprecated Use `addTag` instead.
   */
  addOption = this.addTag

  /**
   * @deprecated Use `addRemovableTag` instead.
   */
  addRemovableOption = this.addRemovableTag

  addTag(text: string, build?: (el: HTMLElement) => void) {
    this.tryAppendControls()
    const el = html`<div class="typ-tag">${text} </div>`
    build?.(el)
    this.controls.prepend(el)
  }

  addRemovableTag(text: string, onClose: () => void = _.noop) {
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
