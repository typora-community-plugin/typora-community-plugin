import './setting-item.scss'
import * as _ from 'lodash'
import { View } from "src/ui/view"
import { html } from "src/utils/html"
import { EditableTable } from '../components/editable-table'


type SelectOptions = {
  options: string[]
  selected: string
  onchange: (event: Event & { target: HTMLSelectElement }) => void
}

export class SettingItem extends View {

  info: HTMLElement
  controls: HTMLElement

  constructor() {
    super()
    this.containerEl = html`<div class="typ-setting-item multiline"></div>`
  }

  onload() {
  }

  onunload() {
    this.containerEl.remove()
  }

  addName(name: string) {
    this.containerEl.append(
      this.info = html`<div class="typ-setting-info"><div class="typ-setting-name">${name}</div></div>`)
  }

  addDescription(description: string) {
    this.info.append(html`<div class="typ-setting-description">${description}</div>`)
  }

  addCheckbox(build: (checkbox: HTMLInputElement) => void) {
    const input = html`<input type="checkbox">` as HTMLInputElement
    build(input)
    this.containerEl.prepend(input)
  }

  private tryAddControls() {
    if (this.controls) return
    this.containerEl.append(
      this.controls = html`<div class="typ-setting-controls"></div>`)
  }

  addButton(build: (button: HTMLButtonElement) => void) {
    this.tryAddControls()
    const button = html`<button></button>` as HTMLButtonElement
    build(button)
    this.controls.append(button)
  }

  addInput(type: string, build: (checkbox: HTMLInputElement) => void) {
    const input = html`<input type="${type}">` as HTMLInputElement
    build(input)
    this.controls.append(input)
  }

  addText(build: (checkbox: HTMLInputElement) => void) {
    this.addInput('text', build)
  }

  addSelect(options: SelectOptions) {
    this.tryAddControls()
    const el = html`<select>${options.options.map(o => `<option ${o === options.selected ? 'selected' : ''}>${o}</option>`).join('')}</select>` as HTMLSelectElement
    el.onchange = options.onchange
    this.controls.append(el)
  }

  addOption(text: string, build?: (el: HTMLElement) => void) {
    this.tryAddControls()
    const el = html`<div class="typ-setting-option">${text} </div>`
    build?.(el)
    this.controls.prepend(el)
  }

  addRemovableOption(text: string, onClose: () => void = _.noop) {
    this.addOption(text, el => {
      el.classList.add('removable')

      $(`<span class="fa fa-times"></span>`)
        .on('click', () => {
          el.remove()
          onClose()
        })
        .appendTo(el)
    })
  }

  addTable(build: (table: EditableTable<any>) => void) {
    const table = new EditableTable()
    build(table)
    this.addChild(table)
    this.containerEl.append(table.containerEl)
  }
}
