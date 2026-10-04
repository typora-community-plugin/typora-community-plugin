import './settings-modal.scss'
import { useService } from 'src/common/service'
import { Modal } from "src/ui/components/modal"
import { html } from 'src/utils'
import type { SettingTab } from './setting-tab'
import { HotkeySettingTab } from "./tabs/hotkey-setting-tab"
import { FileLinkSettingTab } from './tabs/file-link-setting-tab'
import { AppearanceSettingTab } from "./tabs/appearance-setting-tab"
import { InternalPluginsManagerSettingTab } from './tabs/internal-plugin-manager-setting-tab'
import { PluginMarketplaceSettingTab } from './tabs/plugin-marketplace-setting-tab'
import { PluginManagerSettingTab } from "./tabs/plugin-manager-setting-tab"
import { AboutTab } from './tabs/about-tab'
import { Component } from 'src/common/component'
import { PublicEvents } from 'src/common/events'


export type SettingsModalEvents = {
  'open'(): void
}

/**
 * @private
 * @example
 *
 * ```js
 * // Get instance
 * const modal = app.workspace.getViewByType(SettingsModal)
 * ```
 */
export class SettingsModal extends Component {

  private modal!: Modal

  private sidebar!: HTMLElement
  private allGroups: HTMLElement[] = []
  private main!: HTMLElement

  activeTab!: SettingTab
  private tabs: SettingTab[] = []

  private _events = new PublicEvents<SettingsModalEvents>('settings-modal')

  constructor(
    private config = useService('config-repository'),
    private i18n = useService('i18n'),
    private commands = useService('command-manager'),
  ) {
    super()

    config.on('switch', () => {
      const t = i18n.t.settingModal
      this.modal.setHeader(
        this.config.isUsingGlobalConfig
          ? t.titleGlobal
          : t.titleVault)
      this.openTab(this.tabs[0])
    })
  }

  onload() {
    const t = this.i18n.t.settingModal

    this.register(
      this.commands.register({
        id: 'settings:open',
        title: t.commandOpen,
        scope: 'global',
        hotkey: 'Ctrl+.',
        callback: () => {
          this._events.emit('open')
          this.modal.open()
        },
      }))

    this.modal = new Modal({
      className: 'typ-settings-modal'
    })
      .then(el => {
        // fix: clicking on the link in setting modal (out of editor) will close Typora unexpectly
        el.addEventListener('click', event => {
          const anchorEl = (event.target as HTMLElement).closest('a')
          if (anchorEl && anchorEl.getAttribute('href')) {
            event.preventDefault()
            event.stopPropagation()
            useService('app').openLink(anchorEl.getAttribute('href')!)
          }
        })
      })
      .setHeader(this.config.isUsingGlobalConfig
        ? t.titleGlobal
        : t.titleVault
      )
      .setBody(body => {
        body.append(
          this.sidebar = html`<div class="typ-sidebar"></div>`,
          this.main = html`<div class="typ-main"></div>`,
        )

        this.sidebar.addEventListener('click', this.onItemClick)
      })

    super.onload()

    this.addGroup(t.groupCore)
    this.addGroupedTab(0, new FileLinkSettingTab())
    this.addGroupedTab(0, new AppearanceSettingTab())
    this.addGroupedTab(0, new HotkeySettingTab())
    this.addGroupedTab(0, new InternalPluginsManagerSettingTab())
    this.addGroupedTab(0, new PluginMarketplaceSettingTab())
    this.addGroupedTab(0, new PluginManagerSettingTab())
    this.addGroupedTab(0, new AboutTab())

    this.addGroup(t.groupInternalPlugins)

    this.addGroup(t.groupPlugins)
  }

  private onItemClick = (event: MouseEvent) => {
    const item = (event.target as HTMLElement).closest('.typ-nav__item') as HTMLElement | null
    if (!item) return

    const name = item.dataset.name!
    this.openTab(this.tabs.find(tab => tab.name === name)!)
  }

  private addGroup(text: string) {
    const group = html`<section class="typ-nav__group"></section>`
    this.sidebar.append(group)
    group.append(html`<div class="typ-nav__group-title">${text}</div>`)
    this.allGroups.push(group)
    return group
  }

  addGroupedTab(groupIndex: number, tab: SettingTab) {
    const group = this.allGroups[groupIndex]
    if (!group) throw new Error(`SettingsModal: group at index ${groupIndex} not found`)

    this.tabs.push(tab)

    // @deprecated
    tab.load()

    if (this.tabs.length === 1) {
      this.activeTab = this.tabs[0] as SettingTab
      setTimeout(() => this.openTab(this.activeTab))
    }

    group.append(this.createNavItem(tab))

    if (groupIndex > 0) {
      this.sortGroup(group)
    }

    return () => this.removeTab(tab)
  }

  private createNavItem(tab: SettingTab) {
    const item = html`<div class="typ-nav__item" data-name="${tab.name}"></div>`
    item.append(html`<span class="typ-nav__item-name">${tab.name}</span>`)

    if (tab.pill !== undefined && tab.pill !== '') {
      item.append(html`<span class="typ-nav__badge">${tab.pill}</span>`)
    }

    return item
  }

  /**
   * Set (or remove with `undefined`/`''`) the pill/badge of a tab's nav item.
   */
  setTabPill(tab: SettingTab, pill?: string | number) {
    const item = this.sidebar.querySelector(`.typ-nav__item[data-name="${tab.name}"]`)
    if (!item) return

    const badge = item.querySelector('.typ-nav__badge')
    if (pill === undefined || pill === '') {
      badge?.remove()
      return
    }

    if (badge) {
      badge.textContent = String(pill)
    } else {
      item.append(html`<span class="typ-nav__badge">${pill}</span>`)
    }
  }

  private sortGroup(group: HTMLElement) {
    const items = Array.from(group.querySelectorAll('.typ-nav__item')) as HTMLElement[]
    items.sort((a, b) => {
      const nameA = a.querySelector('.typ-nav__item-name')?.textContent ?? ''
      const nameB = b.querySelector('.typ-nav__item-name')?.textContent ?? ''
      return nameA.localeCompare(nameB)
    })
    for (const item of items) {
      group.appendChild(item)
    }
  }

  removeTab(tab: SettingTab) {
    this.sidebar.querySelector(`.typ-nav__item[data-name="${tab.name}"]`)?.remove()
    this.tabs = this.tabs.filter(t => t !== tab)
  }

  openTab(tab: SettingTab) {
    this.sidebar.querySelector('.active')?.classList.remove('active')
    this.sidebar.querySelector(`[data-name="${tab.name}"]`)!.classList.add('active')

    this.activeTab?.containerEl?.remove()
    this.activeTab?.hide()

    this.activeTab = tab

    this.main.append(tab.containerEl)
    this.activeTab.show()
  }

  on(...args: Parameters<PublicEvents<SettingsModalEvents>['on']>) {
    return this._events.on(...args)
  }

  once(...args: Parameters<PublicEvents<SettingsModalEvents>['once']>) {
    return this._events.once(...args)
  }
}
