import './setting-item.scss'
import { EditableTable } from 'src/ui/components/editable-table'
import { View } from "src/ui/common/view"
import { html, noop } from 'src/utils'
import type { Settings } from 'src/settings/settings'


export class SettingContainer {

  containerEl: HTMLElement

  constructor(el: HTMLElement) {
    this.containerEl = el
  }

  addSetting(build: (setting: SettingItem) => void) {
    const setting = new SettingItem()
    build(setting)
    this.containerEl.append(setting.containerEl)
  }
}

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

  name: HTMLElement | undefined

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

  addTitle(text: string): void
  addTitle(build: (el: HTMLElement) => void): void
  addTitle(param0: string | ((el: HTMLElement) => void)) {
    const el = html`<h3 class="typ-setting-title"></h3>`

    if (typeof param0 === 'string') {
      el.innerText = `${param0}`
    } else {
      param0(el)
    }

    this.info.append(el)
  }

  addName(name: string): void
  addName(build: (el: HTMLElement) => void): void
  addName(param0: string | ((el: HTMLElement) => void)) {
    const el = html`<div class="typ-setting-name"></div>`

    if (typeof param0 === 'string') {
      el.innerText = `${param0} `
    } else {
      param0(el)
    }

    this.name = el
    this.info.append(el)
  }

  /**
   * Add badge to `name` element.
   */
  addBadge(text: string): void
  addBadge(build: (el: HTMLElement) => void): void
  addBadge(param0: string | ((el: HTMLElement) => void)) {
    if (!this.name) {
      this.addName('')
    }

    const el = html` <code></code>`

    if (typeof param0 === 'string') {
      el.innerHTML = param0
    } else {
      param0(el)
    }

    this.name!.append(el)
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

  addCheckbox(options: { settings: Settings<any>, bindingKey: string }): void
  addCheckbox(build: (checkbox: HTMLInputElement) => void): void
  addCheckbox(param0: { settings: Settings<any>, bindingKey: string } | ((checkbox: HTMLInputElement) => void)) {
    const input = html`<input type="checkbox">` as HTMLInputElement

    if (typeof param0 === 'function') {
      param0(input)
    }
    else {
      const value = param0.settings.get(param0.bindingKey)
      return this.addCheckbox(checkbox => {
        checkbox.checked = value
        checkbox.onclick = () => {
          param0.settings.set(param0.bindingKey, checkbox.checked)
        }
      })
    }

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

  addTextArea(build: (input: HTMLTextAreaElement) => void) {
    const text = html`<textarea></textarea>` as HTMLTextAreaElement
    build(text)
    this.info.append(text)
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

      select.onchange = param0.onchange as any
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
    this.containerEl.append(table.containerEl)
  }

  /**
   * Add a sidebar + panel layout. The active state is managed internally;
   * `onSelect` receives the selected item, the panel element and a `panel`
   * object supporting `addSetting()` to compose multiple setting rows into it.
   * Returns an object with methods to manage the sidebar list dynamically.
   * @beta
   */
  addSidebarLayout(
    options: { items: string[]; initialActive?: string },
    onSelect: (ctx: { items: string[], item: string; panelEl: HTMLElement; panel: SettingContainer }) => void,
  ): {
    setItems(items: string[]): void
    addItem(item: string): void
    removeItem(item: string): void
  } {
    const layoutEl = html`<div class="typ-setting-sidebar-layout"></div>`
    const sidebarEl = html`<aside class="typ-sidebar typ-setting-sidebar"></aside>`
    const panelEl = html`<div class="typ-setting-panel"></div>`
    layoutEl.append(sidebarEl, panelEl)

    let active = options.initialActive ?? options.items[0]

    const renderSidebar = () => {
      sidebarEl.replaceChildren()
      for (const item of options.items) {
        const el = html`<div class="typ-nav__item"></div>` as HTMLElement
        el.textContent = item
        if (item === active) el.classList.add('active')
        el.onclick = () => select(item)
        sidebarEl.append(el)
      }
    }

    const select = (item: string) => {
      active = item
      renderSidebar()
      panelEl.replaceChildren()
      const panel = new SettingContainer(panelEl)
      onSelect({ items: options.items, item, panelEl, panel })
    }

    renderSidebar()
    if (options.items.length) select(active!)

    this.info.append(layoutEl)

    return {
      setItems(items: string[]) {
        options.items = [...items]
        if (options.items.length) {
          if (!options.items.includes(active)) active = options.items[0]
          select(active)
        } else {
          sidebarEl.replaceChildren()
          panelEl.replaceChildren()
        }
      },
      addItem(item: string) {
        if (!options.items.includes(item)) {
          options.items.push(item)
          renderSidebar()
        }
      },
      removeItem(item: string) {
        const index = options.items.indexOf(item)
        if (index >= 0) {
          options.items.splice(index, 1)
          if (item === active && !options.items.length) {
            renderSidebar()
            panelEl.replaceChildren()
          } else if (item === active) {
            select(options.items[0])
          } else {
            renderSidebar()
          }
        }
      },
    }
  }
}
