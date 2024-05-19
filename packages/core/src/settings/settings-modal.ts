import './settings-modal.scss'
import type { App } from "src/app"
import { Modal } from "src/components/modal"
import { html } from 'src/utils/html'
import type { SettingTab } from './setting-tab'
import { HotkeySettingTab } from "./setting-tabs/hotkey-setting-tab"
import { FileLinkSettingTab } from './setting-tabs/file-link-setting-tab'
import { AppearanceSettingTab } from "./setting-tabs/appearance-setting-tab"
import { PluginMarketplaceSettingTab } from './setting-tabs/plugin-marketplace-setting-tab'
import { PluginsManagerSettingTab } from "./setting-tabs/plugin-manager-setting-tab"
import { AboutTab } from './setting-tabs/about-tab'


/**
 * @example
 *
 * ```js
 * // Get instance
 * const modal = app.workspace.getViewByType(SettingsModal)
 * ```
 */
export class SettingsModal extends Modal {

  private sidebar: HTMLElement
  private main: HTMLElement

  activeTab: SettingTab

  constructor(private app: App) {
    super()
  }

  onload() {
    const t = this.app.i18n.t.settingModal

    this.register(
      this.app.commands.register({
        id: 'settings:open',
        title: t.commandOpen,
        scope: 'global',
        hotkey: 'Ctrl+.',
        callback: () => this.show(),
      }))

    super.onload()

    this.modal.classList.add('typ-settings-modal')

    this.addHeader(t.title)
    this.addBody(body => {
      body.append(
        this.sidebar = html`<div class="typ-sidebar"></div>`,
        this.main = html`<div class="typ-main"></div>`,
      )

      this.sidebar.addEventListener('click', this.onItemClick)
    })

    this.addGroupTitle(t.groupCore)
    this.addTab(new FileLinkSettingTab(this.app))
    this.addTab(new AppearanceSettingTab(this.app))
    this.addTab(new HotkeySettingTab(this.app))
    this.addTab(new PluginMarketplaceSettingTab(this.app))
    this.addTab(new PluginsManagerSettingTab(this.app))
    this.addTab(new AboutTab(this.app))

    setTimeout(() => this.addGroupTitle(t.groupPlugins))

    if (!this.app.plugins.marketplace.isLoaded) {
      this.app.plugins.marketplace.loadCommunityPlugins()
    }
  }

  private onItemClick = (event: MouseEvent) => {
    const el = event.target as HTMLElement
    if (!el.classList.contains("typ-nav__item")) return

    const tabs = this._children as SettingTab[]
    const name = el.dataset.name!
    this.openTab(tabs.find(tab => tab.name === name)!)
  }

  private addGroupTitle(text: string) {
    this.sidebar.append(html`<div class="typ-nav__group-title">${text}</div>`)
  }

  addTab(tab: SettingTab) {
    this.addChild(tab)

    if (this._children.length === 1) {
      this.activeTab = this._children[0] as SettingTab
      setTimeout(() => this.openTab(this.activeTab))
    }

    this.sidebar.append(
      html`<div class="typ-nav__item" data-name="${tab.name}">${tab.name}</div>`
    )

    setTimeout(() => {
      tab.containerEl.classList.add('typ-setting-tab')
      this.main.append(tab.containerEl)
    })

    return () => this.removeTab(tab)
  }

  removeTab(tab: SettingTab) {
    this.sidebar.querySelector(`.typ-nav__item[data-name="${tab.name}"]`)?.remove()
    this.removeChild(tab)
  }

  openTab(tab: SettingTab) {
    this.sidebar.querySelector('.active')?.classList.remove('active')
    this.sidebar.querySelector(`[data-name="${tab.name}"]`)!.classList.add('active')

    this.activeTab?.hide()
    this.activeTab = tab
    tab.show()
  }
}
