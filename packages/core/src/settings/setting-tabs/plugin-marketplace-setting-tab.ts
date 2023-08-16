import type { App } from "src/app"
import { PluginMarketplace, type PluginMarketInfo } from "src/plugin/plugin-marketplace"
import { SettingTab } from "../setting-tab"


export type PluginMarketplaceSettings = {
  githubProxy: string
}

const DEFAULT_SETTINGS: PluginMarketplaceSettings = {
  githubProxy: 'github',
}

export class PluginMarketplaceSettingTab extends SettingTab {

  get name() {
    return this.app.i18n.t.settingTabs.pluginMarketplace.name
  }

  private markettplace: PluginMarketplace

  constructor(private app: App) {
    super()

    app.settings.setDefault(DEFAULT_SETTINGS)
    app.settings.onChange('githubProxy', () => {
      this.renderPluginList()
    })

    this.markettplace = new PluginMarketplace(app)
  }

  onload() {
    const { settings } = this.app
    const t = this.app.i18n.t.settingTabs.pluginMarketplace

    this.addSettingTitle(t.githubProxy)

    this.addSetting(setting => {
      setting.addName(t.githubProxySource)
      setting.addSelect({
        options: this.app.github.proxies.map(u => u.id),
        selected: settings.get('githubProxy'),
        onchange: (event) => settings.set('githubProxy', event.target.value)
      })
    })

    this.addSettingTitle(t.pluginList)
  }

  show() {
    this.renderPluginList()
    super.show()
  }

  hide() {
    this.cleanPluginList()
    super.hide()
  }

  private renderPluginList() {
    this.cleanPluginList()
    this.markettplace.loadCommunityPlugins()
      .then(data => data.forEach(p => this.renderPlugins(p)))
  }

  private cleanPluginList() {
    this.containerEl.querySelectorAll('.typ-plugin-item')
      .forEach(el => el.remove())
  }

  private renderPlugins(info: PluginMarketInfo) {
    const t = this.app.i18n.t.settingTabs.pluginMarketplace

    this.addSetting(setting => {
      setting.containerEl.classList.add('typ-plugin-item')

      setting.addName(info.name || info.id)
      setting.addDescription(`${t.author}: ${info.author}`)
      setting.addDescription(info.description)

      if (this.app.plugins.manifests[info.id]) return

      setting.addButton(button => {
        button.innerText = t.installToGlobal
        button.classList.add('primary')
        button.onclick = () =>
          this.markettplace.installPlugin(info, 'global')
            .then(() => setting.controls.remove())
      })

      setting.addButton(button => {
        button.innerText = t.installToVault
        button.classList.add('primary')
        button.onclick = () =>
          this.markettplace.installPlugin(info, 'vault')
            .then(() => setting.controls.remove())
      })
    })
  }

}
