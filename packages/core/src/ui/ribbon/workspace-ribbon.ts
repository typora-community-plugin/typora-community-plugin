import './workspace-ribbon.scss'
import decorate from '@plylrnsdy/decorate.js'
import { editor, File } from 'typora'
import type { App } from 'src/app'
import { draggable } from 'src/components/draggable'
import { Menu } from 'src/components/menu'
import { html } from 'src/utils/html'
import { View } from 'src/ui/view'
import type { DisposeFunc } from 'src/utils/types'


export type RibbonSettings = {
  ribbonState: Record<string, {
    visible: boolean
    order: number
  }>
}

const DEFAULT_SETTINGS: RibbonSettings = {
  ribbonState: {},
}

export const BUILT_IN = Symbol('built-in')

interface RibbonItemButton {
  group?: 'top' | 'bottom'
  id: string
  title: string
  className?: string
  icon: HTMLElement
  onclick?: (event: MouseEvent) => void

  [BUILT_IN]?: boolean
  /**
   * @default true
   */
  visible?: boolean
  order?: number
}

/**
 * @example
 *
 * ```js
 * // Get instance
 * const ribbon = app.workspace.ribbon
 * ```
 */
export class WorkspaceRibbon extends View {

  private buttons = [] as RibbonItemButton[]

  constructor(private app: App) {
    super()

    app.settings.setDefault(DEFAULT_SETTINGS)

    this._addDefaultButton()

    this.app.settings.onChange('showRibbon', (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  get ribbonWidth() {
    const root = document.documentElement
    return +getComputedStyle(root)
      .getPropertyValue('--typ-ribbon-width')
      .trim()
      .slice(0, -2)
  }

  load() {
    if (!this.app.settings.get('showRibbon')) {
      return
    }
    super.load()
  }

  onload() {
    this.containerEl = this._buildRibbonContainer()
    this.buttons
      .sort((a, b) => a.order - b.order)
      .forEach(btn => this._renderButton(btn))

    this._setupContextMenu()

    this.register(
      decorate.parameters(editor.library, 'setSidebarWidth', ([width, saveInSettings]) =>
        [width - (saveInSettings ? this.ribbonWidth : 0), saveInSettings] as [number, boolean]
      ))

    document.body.classList.add('typ-ribbon--enable')
    document.querySelector('#typora-sidebar-resizer')!.insertAdjacentElement('afterend', this.containerEl)
  }

  onunload() {
    document.body.classList.remove('typ-ribbon--enable')
    this.containerEl.remove()
  }

  private _buildRibbonContainer() {
    const container = $('<div class="typ-ribbon">')
      .append(
        '<div class="group top"></div>',
        '<div class="group bottom"></div>',
      )

    draggable(container.find('.group.top').get(0), 'y', () => {
      const el = this.containerEl.querySelector(`.group.top`)
      Array.from(el.children)
        .forEach((icon: HTMLElement, i) => {
          const btn = this.buttons.find(btn => btn.id === icon.dataset.id)
          btn.order = i
        })
      this.app.settings.set('ribbonState', this.getState())
    })

    return container.get(0)
  }

  private _setupContextMenu() {
    const menu = new Menu()

    this.registerDomEvent($('.group.top', this.containerEl).get(0), 'contextmenu', (event: MouseEvent) => {
      menu.empty()

      this.buttons
        .filter(btn => btn.group !== 'bottom')
        .forEach(btn => {
          menu.addItem(item => {
            item
              .setKey(btn.id)
              .setIcon(btn.icon.cloneNode(true) as HTMLElement)
              .setTitle(btn.title)
              .onClick(() => this.toggleButton(btn))
          })
        })

      menu.showAtMouseEvent(event)
    })

    this.addChild(menu)
  }

  private _addDefaultButton() {
    const { t } = this.app.i18n

    const menu = new Menu()
      .addItem(item => {
        item
          .setKey('app-settings')
          .setTitle(t.ribbon.settingOfApp)
          .onClick(() => File.megaMenu.showPreferencePanel())
      })
      .addItem(item => {
        item
          .setKey('plugin-settings')
          .setTitle(t.ribbon.settingOfPlugin)
          .onClick(() => this.app.commands.run('settings:open'))
      })

    this.addChild(menu)

    this.addButton({
      [BUILT_IN]: true,
      group: 'bottom',
      id: 'core.settings',
      title: this.app.i18n.t.ribbon.settings,
      icon: html`<i class="fa fa-cog"></i>`,
      onclick(event) {
        menu.showAtMouseEvent(event)
      },
    })
  }

  addButton(button: RibbonItemButton): DisposeFunc {
    if (this.buttons.find(btn => btn.id === button.id)) {
      throw Error('[WorkspaceRibbon] Button\'s id duplicated!')
    }

    const state = this.app.settings.get('ribbonState')[button.id]
    if (state) {
      button.visible = state.visible
      button.order = state.order
    }
    if (!('visible' in button)) {
      button.visible = true
    }
    if (!('order' in button)) {
      button.order = this.buttons.length - 1
    }

    this.buttons.push(button)

    if (this.containerEl) {
      this._renderButton(button)
    }
    return () => this.removeButton(button)
  }

  removeButton(button: RibbonItemButton) {
    const el = this.containerEl.querySelector(`.typ-ribbon-item[data-id="${button.id}"]`) as HTMLElement
    el.remove()

    this.buttons = this.buttons.filter(btn => btn !== button)
  }

  activeButton(id: string) {
    $('.typ-ribbon-item').removeClass('active')
    $(`.typ-ribbon-item[data-id="${id}"]`).addClass('active')
  }

  toggleButton(button: RibbonItemButton, visible?: boolean) {
    button.visible = visible ?? !button.visible

    button.visible
      ? this.showButton(button)
      : this.hideButton(button)

    this.app.settings.set('ribbonState', this.getState())
  }

  showButton(button: RibbonItemButton) {
    const el = this.containerEl.querySelector(`.typ-ribbon-item[data-id="${button.id}"]`) as HTMLElement
    el.style.display = 'flex'
  }

  hideButton(button: RibbonItemButton) {
    const el = this.containerEl.querySelector(`.typ-ribbon-item[data-id="${button.id}"]`) as HTMLElement
    el.style.display = 'none'
  }

  private _renderButton(button: RibbonItemButton) {
    if (!('group' in button)) {
      button.group = 'top'
    }

    const itemEl = document.createElement('div')
    itemEl.title = button.title ?? ''
    itemEl.dataset.id = button.id
    itemEl.setAttribute('draggable', 'true')

    itemEl.style.display = button.visible ? 'flex' : 'none'
    itemEl.classList.add('typ-ribbon-item')
    if (button.className) {
      itemEl.classList.add(button.className)
    }

    if (!button[BUILT_IN]) {
      itemEl.addEventListener('click', () => {
        $('#typora-sidebar')
          .removeClass('active-tab-files')
          .removeClass('ty-show-search')
          .removeClass('active-tab-outline')
      })
    }
    if (button.onclick) {
      itemEl.addEventListener('click', e => {
        this.activeButton(button.id)
        button.onclick(e)
      })
    }

    itemEl.append(button.icon)

    this.containerEl.querySelector(`.group.${button.group}`)!
      .append(itemEl)
  }

  private getState() {
    return this.buttons
      .filter(btn => btn.group !== 'bottom')
      .reduce((o, btn, i) => (
        o[btn.id] = {
          visible: btn.visible!,
          order: btn.order ?? i,
        },
        o
      ), {} as RibbonSettings['ribbonState'])
  }
}
