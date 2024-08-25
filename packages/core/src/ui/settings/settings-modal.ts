import './settings-modal.scss'
import { useService } from 'src/common/service'
import { Modal } from "src/ui/components/modal"
import { html } from 'src/utils/html'
import type { SettingTab } from './setting-tab'
import { HotkeySettingTab } from "./tabs/hotkey-setting-tab"
import { FileLinkSettingTab } from './tabs/file-link-setting-tab'
import { AppearanceSettingTab } from "./tabs/appearance-setting-tab"
import { PluginMarketplaceSettingTab } from './tabs/plugin-marketplace-setting-tab'
import { PluginsManagerSettingTab } from "./tabs/plugin-manager-setting-tab"
import { AboutTab } from './tabs/about-tab'


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

  constructor(
    config = useService('config-repository'),
    private i18n = useService('i18n'),
    private commands = useService('command-manager'),
    private plugins = useService('plugin-manager'),
  ) {
    super()

    config.on('switch', () =>
      this.openTab(this._children[0] as SettingTab)
    )
  }

  onload() {
    const t = this.i18n.t.settingModal

    this.register(
      this.commands.register({
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
    this.addTab(new FileLinkSettingTab())
    this.addTab(new AppearanceSettingTab())
    this.addTab(new HotkeySettingTab())
    this.addTab(new PluginMarketplaceSettingTab())
    this.addTab(new PluginsManagerSettingTab())
    this.addTab(new AboutTab())

    this.addGroupTitle(t.groupPlugins)

    // fix: clicking on the link in setting modal (out of editor) will close Typora unexpectly
    this.containerEl.addEventListener('click', event => {
      const el = event.target as HTMLElement
      if (el.tagName === 'A' && el.getAttribute('href')) {
        event.preventDefault()
        event.stopPropagation()
        useService('app').openLink(el.getAttribute('href'))
      }
    })
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
