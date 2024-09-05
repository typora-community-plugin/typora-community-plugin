import './workspace-ribbon.scss'
import decorate from '@plylrnsdy/decorate.js'
import { editor, File } from 'typora'
import { useService } from 'src/common/service'
import { draggable } from 'src/ui/components/draggable'
import { Menu } from 'src/ui/components/menu'
import { html } from 'src/utils'
import { View } from 'src/ui/common/view'
import type { DisposeFunc } from 'src/utils/types'
import { Component } from 'src/common/component'


export type RibbonSettings = {
  ribbonState: Record<string, {
    visible: boolean
    order: number
  }>
}

export const DEFAULT_RIBBON_SETTINGS: RibbonSettings = {
  ribbonState: {},
}

export const BUILT_IN = Symbol('built-in')

export interface RibbonItemButton {
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
export class WorkspaceRibbon extends Component {

  private ribbonView: RibbonView
  private buttons = [] as RibbonItemButton[]

  constructor(
    private config = useService('config-repository'),
    private settings = useService('settings'),
    private i18n = useService('i18n'),
    private commands = useService('command-manager'),
  ) {
    super()

    settings.setDefault(DEFAULT_RIBBON_SETTINGS)

    // NOT need to register here, because it will be lost reactive when `unload`
    settings.onChange('showRibbon', (_, isEnabled) => {
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
    if (!this.settings.get('showRibbon')) {
      return
    }
    super.load()
  }

  onload() {
    this.register(
      decorate.parameters(editor.library, 'setSidebarWidth', ([width, saveInSettings]) =>
        [width - (saveInSettings ? this.ribbonWidth : 0), saveInSettings] as [number, boolean]
      ))

    this.ribbonView = new RibbonView({
      buttons: this.buttons,
      onChange: buttons => {
        this.settings.set('ribbonState', this.getState())
      }
    })

    this._addDefaultButton()

    document.body.classList.add('typ-ribbon--enable')
    document.querySelector('#typora-sidebar-resizer')!.insertAdjacentElement('afterend', this.ribbonView.containerEl)
  }

  onunload() {
    document.body.classList.remove('typ-ribbon--enable')
    this.ribbonView.containerEl.remove()
  }

  private _addDefaultButton() {
    const { t } = this.i18n

    const menu = new Menu()
    this.register(
      this.addButton({
        [BUILT_IN]: true,
        group: 'bottom',
        id: 'core.settings',
        title: this.i18n.t.ribbon.settings,
        icon: html`<i class="fa fa-cog"></i>`,
        onclick: (event) => {
          menu
            .empty()
            .addItem(item => {
              item
                .setKey('app-settings')
                .setTitle(t.ribbon.settingOfApp)
                .onClick(() => File.megaMenu.showPreferencePanel())
            })
            .addItem(item => {
              item
                .setKey('plugin-settings')
                .setTitle(
                  this.config.isUsingGlobalConfig
                    ? t.ribbon.globalSettingOfPlugin
                    : t.ribbon.vaultSettingOfPlugin
                )
                .onClick(() => this.commands.run('settings:open'))
            })
            .showAtMouseEvent(event)
        },
      }))
  }

  addButton(button: RibbonItemButton): DisposeFunc {
    if (this.buttons.find(btn => btn.id === button.id)) {
      throw Error('[WorkspaceRibbon] Button\'s id duplicated!')
    }

    const state = this.settings.get('ribbonState')[button.id]
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

    this.ribbonView.renderButton(button)

    return () => this.removeButton(button)
  }

  removeButton(button: RibbonItemButton) {
    this.ribbonView.removeButton(button)
    this.buttons = this.buttons.filter(btn => btn !== button)
  }

  activeButton(id: string) {
    this.ribbonView.activeButton(id)
  }

  clickButton(id: string) {
    this.ribbonView.clickButton(id)
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

interface RibbonViewProps {
  buttons: RibbonItemButton[]
  onChange?: (buttons: RibbonItemButton[]) => void
}

class RibbonView extends View {

  dispalyMenu: Menu

  groupTop: HTMLElement
  groupBottom: HTMLElement

  constructor(
    private props: RibbonViewProps,
  ) {
    super()

    this.containerEl = html`<div class="typ-ribbon">`
    this.containerEl.append(
      this.groupTop = html`<div class="group top"></div>`,
      this.groupBottom = html`<div class="group bottom"></div>`,
    )

    this.props.buttons
      .sort((a, b) => a.order - b.order)
      .forEach(btn => this.renderButton(btn))

    // ------ Sort buttons ------

    draggable(this.groupTop, 'y', () => {
      const el = this.groupTop
      Array.from(el.children)
        .forEach((icon: HTMLElement, i) => {
          const btn = this.props.buttons.find(btn => btn.id === icon.dataset.id)
          btn.order = i
        })
      this.props.onChange?.(this.props.buttons)
    })

    // ------ Display buttons ------

    this.dispalyMenu = new Menu()

    $(this.groupTop).on('contextmenu', (event) => {
      this.dispalyMenu.empty()

      this.props.buttons
        .filter(btn => btn.group !== 'bottom')
        .forEach(btn => {
          this.dispalyMenu.addItem(item => {
            item
              .setKey(btn.id)
              .setIcon(btn.icon.cloneNode(true) as HTMLElement)
              .setTitle(btn.title)
              .onClick(() => this.toggleButton(btn))
          })
        })

      this.dispalyMenu.showAtMouseEvent(event.originalEvent as MouseEvent)
    })
  }

  renderButton(button: RibbonItemButton) {
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

  removeButton(button: RibbonItemButton) {
    const el = this.containerEl.querySelector(`.typ-ribbon-item[data-id="${button.id}"]`) as HTMLElement
    el.remove()
  }

  toggleButton(button: RibbonItemButton) {
    button.visible = !button.visible
    button.visible
      ? this.showButton(button)
      : this.hideButton(button)
    this.props.onChange?.(this.props.buttons)
  }

  showButton(button: RibbonItemButton) {
    const el = this.containerEl.querySelector(`.typ-ribbon-item[data-id="${button.id}"]`) as HTMLElement
    el.style.display = 'flex'
  }

  hideButton(button: RibbonItemButton) {
    const el = this.containerEl.querySelector(`.typ-ribbon-item[data-id="${button.id}"]`) as HTMLElement
    el.style.display = 'none'
  }

  activeButton(id: string) {
    $('.typ-ribbon-item', this.containerEl).removeClass('active')
    $(`.typ-ribbon-item[data-id="${id}"]`, this.containerEl).addClass('active')
  }

  clickButton(id: string) {
    $(`.typ-ribbon-item[data-id="${id}"]`, this.containerEl).get(0).click()
  }
}
