import { View } from "src/ui/view"
import { html } from "src/utils/html"


interface MenuPositionDef {
  x: number
  y: number
}

export class Menu extends View {

  constructor() {
    super()
    this.containerEl = html`<ul class="dropdown-menu context-menu" role="menu">`

    this.containerEl.onclick = () => this.hide()

    document.body.append(this.containerEl)
  }

  /**
   * Remove all menu items.
   */
  empty(): this {
    this.containerEl.innerHTML = ''
    return this
  }

  addItem(build: (item: MenuItem) => any): this {
    // @ts-ignore
    const item = new MenuItem()
    build(item)
    this.containerEl.append(item.containerEl)
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
    this.show()
    return this
  }

  /**
   * Show menu.
   *
   * Do not use it directly. Use `showAtMouseEvent()` or `showAtPosition()` instead.
   */
  show() {
    setTimeout(() => {
      this.containerEl.style.display = 'block'
      this.registerDomEvent(document.body, 'click', event => {
        if ((<HTMLElement>event.target).closest('.context-menu')) return
        this.hide()
      })
    })
  }

  hide(): this {
    this.containerEl.style.display = 'none'
    this.unload()
    return this
  }
}

export class MenuItem {

  private containerEl: HTMLElement
  private anchorEl: HTMLElement
  private iconEl: HTMLElement

  private title: string

  /**
   * Private constructor. Use {@link Menu.addItem} instead.
   */
  private constructor() {
    this.containerEl = html`<li></li>`
    this.anchorEl = html`<a></a>`

    this.containerEl.append(this.anchorEl)
  }

  setKey(key: string): this {
    this.anchorEl.dataset.key = key
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
    this.anchorEl.innerText = ' ' + this.title
    this.iconEl && this.anchorEl.prepend(this.iconEl)
  }

  onClick(callback: (evt: MouseEvent | KeyboardEvent) => any): this {
    this.containerEl.addEventListener('click', callback)
    return this
  }
}
