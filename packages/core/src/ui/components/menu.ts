import './menu.scss'
import { html } from "src/utils"
import { Closeable, View } from '../common/view'
import { Component } from 'src/common/component'


interface MenuPositionDef {
  x: number
  y: number
}

export class Menu extends View implements Closeable {

  private component = new Component()

  constructor() {
    super()
    this.containerEl = $('<ul class="dropdown-menu context-menu" role="menu">')
      .on('click', () => this.close())
      .get(0)

    document.body.append(this.containerEl)
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
    const item = new MenuItem()
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
  protected constructor() {
    this.containerEl = html`<li data-action="" data-key="" for-file="" for-search="" class="typ-menuitem"></li>`
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
}

export class InternalContextMenu extends Menu {

  private _listeners: Record<string, Function[]> = {}

  constructor(selector: string) {
    super()

    this.containerEl.remove()
    this.containerEl = $(selector)[0]

    $(this.containerEl).on('mousedown', '[data-action]', event => {
      const key = event.target.closest('[data-action]').getAttribute('data-key')
      const listeners = this._listeners[key]
      if (listeners.length) listeners.forEach(callback => callback(event))
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
    this.containerEl.querySelector(selector)
      .insertAdjacentElement('afterend', this._createItem(build).containerEl)
    return this
  }

  insertSeparatorAfter(selector: string) {
    this.containerEl.querySelector(selector)
      .insertAdjacentElement('afterend', this._createSeparator())
    return this
  }

  _registerEvent(key: string, callback: Function) {
    const l = (this._listeners[key] ??= [])
    l.push(callback)
  }
}

class InternalMenuItem extends MenuItem {

  protected constructor(private menu: InternalContextMenu) {
    super()
  }

  onClick(callback: (evt: MouseEvent | KeyboardEvent) => any): this {
    this.menu._registerEvent(this.containerEl.dataset.key, callback)
    return this
  }
}
