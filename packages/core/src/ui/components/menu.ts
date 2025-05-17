import './menu.scss'
import { getChildIndex, html } from "src/utils"
import { Closeable, View } from '../common/view'
import { Component } from 'src/common/component'


interface MenuPositionDef {
  x: number
  y: number
}

export class Menu extends View implements Closeable {

  private submenus: Record<string, Menu> = {}

  private component = new Component()
  private _mouseoverListeners: Record<string, Function> = {}
  private _mouseoutListeners: Record<string, Function> = {}

  constructor() {
    super()
    this.containerEl = $(`<ul class="dropdown-menu context-menu" role="menu">`)
      .on('click', () => this.close())
      .get(0)

    document.body.append(this.containerEl)

    this._registerEvent()
  }

  protected _registerEvent() {
    $(this.containerEl)
      .on('mouseover', event => {
        const key = event.target.closest('[data-action]')?.getAttribute('data-key')
        Object.values(this.submenus).forEach(m => m.close())

        // handle: separator
        if (!key) return

        // handle: menuitem
        const listener = this._mouseoverListeners[key]
        if (listener) listener(event)
      })
  }

  /**
   * Remove all menu items.
   */
  empty(): this {
    this.containerEl.innerHTML = ''
    return this
  }

  protected _createItem(build: (item: MenuItem) => any) {
    // @ts-ignore
    const item = new MenuItem(this)
    build(item)
    return item
  }

  addItem(build: (item: MenuItem) => any): this {
    this.containerEl.append(this._createItem(build).containerEl)
    return this
  }

  protected _createSeparator() {
    return $('<li class="divider typ-menuitem" for-file="" for-folder=""></li>')[0]
  }

  addSeparator() {
    this.containerEl.append(this._createSeparator())
    return this
  }

  /**
   * @private
   */
  _onMouseOver(key: string, callback: (evt: MouseEvent) => any) {
    this._mouseoverListeners[key] = callback
  }

  showAtMouseEvent(event: MouseEvent): this {
    const y = event.clientY < window.innerHeight / 2
      ? event.clientY
      : event.clientY - this.containerEl.children.length * 30 - 8

    const pos = {
      x: event.clientX,
      y,
    }

    this.showAtPosition(pos)
    return this
  }

  showAtPosition(position: MenuPositionDef): this {
    this.containerEl.style.top = position.y + 'px'
    this.containerEl.style.left = position.x + 'px'
    this.open()
    return this
  }

  /**
   * Show menu.
   *
   * Do not use it directly. Use `showAtMouseEvent()` or `showAtPosition()` instead.
   */
  open() {
    setTimeout(() => {
      this.containerEl.style.display = 'block'
      this.component.registerDomEvent(document.body, 'click', event => {
        if ((<HTMLElement>event.target).closest('.context-menu')) return
        this.close()
      })
    })
  }

  close(): this {
    this.containerEl.style.display = 'none'
    this.component.unload()
    return this
  }
}

class MenuItem {

  protected containerEl: HTMLElement
  private anchorEl: HTMLElement
  private iconEl: HTMLElement

  private title: string

  /**
   * Private constructor. Use {@link Menu.addItem} instead.
   */
  protected constructor(protected menu: Menu) {
    this.containerEl = html`<li data-action="" data-key="" class="typ-menuitem"></li>`
    this.anchorEl = html`<a role="menuitem" data-localize="" data-lg="" class="state-off"></a>`

    this.containerEl.append(this.anchorEl)
  }

  setKey(key: string): this {
    this.containerEl.dataset.key = key
    return this
  }

  setTitle(title: string): this {
    this.title = title
    this._setContent()
    return this
  }

  setIcon(icon: string | HTMLElement): this {
    if (typeof icon === 'string') {
      this.iconEl = html`<i class="fa fa-${icon}"></i>`
    }
    else {
      this.iconEl = icon
    }
    this._setContent()
    return this
  }

  private _setContent() {
    this.anchorEl.innerText = this.title
    this.iconEl && this.anchorEl.prepend(this.iconEl)
  }

  onClick(callback: (evt: MouseEvent | KeyboardEvent) => any): this {
    this.containerEl.addEventListener('click', callback)
    return this
  }

  setSubmenu(build: (submenu: Menu) => void) {
    this.containerEl.classList.add('has-extra-menu')
    this.anchorEl.append($('<i class="fa fa-caret-right"></i>')[0])

    const itemKey = this.containerEl.dataset.key
    const submenuKey = itemKey + ':submenu'
    // @ts-ignore
    const submenu = (this.menu.submenus[submenuKey] ??= new Menu())
    submenu.empty()
    build(submenu)

    this.menu._onMouseOver(itemKey, event => {
      const menuEl = this.menu.containerEl
      const i = getChildIndex(this.containerEl)
      const pos = {
        x: +menuEl.style.left.slice(0, -2) + menuEl.offsetWidth + 6,
        y: +menuEl.style.top.slice(0, -2) + this.containerEl.offsetHeight * i,
      }
      submenu.showAtPosition(pos)
    })
    return this
  }
}

export class InternalContextMenu extends Menu {

  private _mousedownListeners: Record<string, Function> = {}

  constructor(selector: string) {
    super()

    this.containerEl.remove()
    this.containerEl = $(selector)[0]

    this._registerEvent()

    $(this.containerEl).on('mousedown', '[data-action]', event => {
      const key = event.target.closest('[data-action]').getAttribute('data-key')
      const listener = this._mousedownListeners[key]
      if (listener) listener(event)
    })
  }

  removeExtendedMenuItem() {
    $(this.containerEl).find('.typ-menuitem').remove()
    return this
  }

  protected _createItem(build: (item: MenuItem) => any) {
    // @ts-ignore
    const item = new InternalMenuItem(this)
    build(item)
    return item
  }

  /**
   * @example
   * app.workspace.on('file-menu', ({ menu }) => {
   *   menu.insertItemAfter('[data-action="open"]', item => {...})
   * })
   */
  insertItemAfter(selector: string, build: (item: MenuItem) => any) {
    const prevItem = this.containerEl.querySelector(selector)
    if (!prevItem) {
      throw Error(`No element matched selector '${selector}'.`)
    }
    prevItem.insertAdjacentElement('afterend', this._createItem(build).containerEl)
    return this
  }

  insertSeparatorAfter(selector: string) {
    this.containerEl.querySelector(selector)
      .insertAdjacentElement('afterend', this._createSeparator())
    return this
  }

  _onMouseDown(key: string, callback: Function) {
    this._mousedownListeners[key] = callback
  }
}

class InternalMenuItem extends MenuItem {

  protected constructor(menu: InternalContextMenu) {
    super(menu)
  }

  onClick(callback: (evt: MouseEvent | KeyboardEvent) => any): this {
    const menu = this.menu as InternalContextMenu
    menu._onMouseDown(this.containerEl.dataset.key, callback)
    return this
  }
}
