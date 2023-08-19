import './workspace-ribbon.scss'
import * as _ from 'lodash'
import { View } from 'src/ui/view'
import type { DisposeFunc } from 'src/utils/types'
import type { App } from 'src/app'
import { editor, File } from 'typora'
import decorate from '@plylrnsdy/decorate.js'
import { html } from 'src/utils/html'
import { ContextMenu, type MenuItem } from 'src/components/context-menu'
import { draggable } from 'src/components/draggable'


export const BUILT_IN = Symbol('built-in')

interface RibbonItemButton {
  group?: 'top' | 'bottom'
  id: string
  title?: string
  className?: string
  icon: HTMLElement
  onclick?: () => void
  menuItems?: MenuItem[]

  [BUILT_IN]?: boolean
}

export class WorkspaceRibbon extends View {

  private buttons = [] as RibbonItemButton[]

  constructor(private app: App) {
    super()

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
    this.buttons.forEach(btn => this._renderButton(btn))

    this.register(
      decorate.parameters(editor.library, 'setSidebarWidth', ([width, saveInSettings]) =>
        [width - (saveInSettings ? this.ribbonWidth : 0), saveInSettings] as [number, boolean]
      ))

    document.body.classList.add('typ-ribbon--enable')
    document.querySelector('header')!.append(this.containerEl)
  }

  onunload() {
    document.body.classList.remove('typ-ribbon--enable')
    this.containerEl.remove()
  }

  private _buildRibbonContainer() {
    const container = document.createElement('div')
    container.classList.add('typ-ribbon')

    container.innerHTML = `
      <div class="group top"></div>
      <div class="group bottom"></div>`

    // draggable(container, 'y')

    return container
  }

  private _addDefaultButton() {
    const { t } = this.app.i18n

    this.addButton({
      [BUILT_IN]: true,
      group: 'bottom',
      id: 'core.settings',
      title: this.app.i18n.t.ribbon.settings,
      icon: html`<i class="fa fa-cog"></i>`,
      menuItems: [{
        id: 'app-settings',
        text: t.ribbon.settingOfApp,
        onclick: () => File.megaMenu.showPreferencePanel()
      }, {
        id: 'plugin-settings',
        text: t.ribbon.settingOfPlugin,
        onclick: () => this.app.commands.run('settings:open')
      }]
    })
  }

  addButton(button: RibbonItemButton): DisposeFunc {
    if(this.buttons.find(btn => btn.id === button.id)) {
      throw Error('[WorkspaceRibbon] Button\'s id duplicated!')
    }
    this.buttons.push(button)

    if (this.containerEl) {
      this._renderButton(button)
    }
    return () => this.removeButton(button)
  }

  removeButton(button: RibbonItemButton) {
    this.buttons = this.buttons.filter(btn => btn === button)
    this.containerEl.querySelector(`.typ-ribbon-item[data-id="${button.id}"]`)?.remove()
  }

  private _renderButton(button: RibbonItemButton) {
    if (!('group' in button)) {
      button.group = 'top'
    }

    const itemEl = document.createElement('div')
    itemEl.title = button.title ?? ''
    itemEl.dataset.id = button.id
    itemEl.setAttribute('draggable', 'true')

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
      itemEl.addEventListener('click', button.onclick)
    }
    else if (button.menuItems) {
      this.addChild(new ContextMenu({
        contextEl: itemEl,
        triggerBy: 'click',
        items: button.menuItems,
      }))
    }

    itemEl.append(button.icon)

    this.containerEl.querySelector(`.group.${button.group}`)!
      .append(itemEl)
  }
}
