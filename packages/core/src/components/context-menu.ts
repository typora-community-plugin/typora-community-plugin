import { View } from '../ui/view'


type MenuShowListener = (this: ContextMenu, event: MenuShowEvent) => void

interface MenuShowEvent {
  target: HTMLElement
}

type MenuItemClickListener = (this: ContextMenu, event: MenuItemClickEvent) => void

interface MenuItemClickEvent {
  target: HTMLElement
  item: MenuItem
}

interface ContextMenuOptions {
  contextEl: HTMLElement
  triggerBy?: 'click' | 'contextmenu'
  items: MenuItem[]
}

export interface MenuItem {
  id: string
  text: string
  onclick?: MenuItemClickListener
}

export class ContextMenu extends View {

  public contextEl: HTMLElement
  private focusedEl: HTMLElement

  private _menuShowListners: MenuShowListener[] = []
  private _itemClickListners: MenuItemClickListener[] = []

  constructor(
    private options: ContextMenuOptions
  ) {
    super()
    options.triggerBy ??= 'contextmenu'
    this.contextEl = options.contextEl
  }

  onload() {
    this._setupContextMenu()
    this.contextEl.addEventListener(this.options.triggerBy!, this._onContextMenu)
    document.body.append(this.containerEl)
  }

  onunload() {
    this.containerEl.remove()
    this.contextEl.removeEventListener(this.options.triggerBy!, this._onContextMenu)
  }

  private _setupContextMenu() {
    if (this.containerEl) return

    const menu = document.createElement('div')
    menu.className = 'dropdown-menu context-menu typ-context-menu'
    menu.innerHTML = this.options.items.map(item => `<li data-key="${item.id}"><a>${item.text}</a></li>`)
      .join('')

    menu.addEventListener('click', (event) => {
      this.containerEl.classList.remove('show')

      const el = event.target as HTMLElement
      const itemEl = el.closest('li')!
      const item = this.options.items.find(item => item.id === itemEl.dataset.key!)!
      const itemEvent = { target: this.focusedEl, item }

      item.onclick?.call(this, itemEvent)
      this._itemClickListners.forEach(fn => fn.call(this, itemEvent))
    })

    this.containerEl = menu
  }

  private _onContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    this.focusedEl = event.target as HTMLElement

    this._menuShowListners.forEach(fn => fn.call(this, { target: this.focusedEl }))

    const top = event.clientY < window.innerHeight / 2
      ? event.clientY
      : event.clientY - this.options.items.length * 30 - 8

    $(this.containerEl)
      .attr('style', `top: ${top}px;left: ${event.clientX}px;`)
      .addClass('show')
  }

  onShow(listener: MenuShowListener) {
    this._menuShowListners.push(listener)
    return this
  }

  onItemClick(listener: MenuItemClickListener) {
    this._itemClickListners.push(listener)
    return this
  }
}
