import * as _ from "lodash"
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

  private pluginList: PluginMarketInfo[] = []

  constructor(private app: App) {
    super()

    app.settings.setDefault(DEFAULT_SETTINGS)
    app.settings.onChange('githubProxy', () => {
      this.loadPluginList()
    })

    this.markettplace = new PluginMarketplace(app)
  }

  onload() {
    const { settings } = this.app
    const t = this.app.i18n.t.settingTabs.pluginMarketplace

    this.addSetting(setting => {
      setting.addName(t.githubProxy)
      setting.addDescription(t.githubProxyDesc)
      setting.addSelect({
        options: this.app.github.proxies.map(u => u.id),
        selected: settings.get('githubProxy'),
        onchange: event => settings.set('githubProxy', event.target.value)
      })
    })

    this.addSetting(setting => {
      setting.addName(t.searchPlugin)
      setting.addText(input => {
        input.oninput = _.debounce(() => {
          this.renderPluginList(input.value)
        }, 500)
      })
    })

    this.addSettingTitle(t.pluginList)
  }

  show() {
    this.loadPluginList()
    super.show()
  }

  hide() {
    this.cleanPluginList()
    super.hide()
  }

  private loadPluginList() {
    this.markettplace.loadCommunityPlugins()
      .then(data => { this.pluginList = data })
      .then(() => this.renderPluginList())
  }

  private renderPluginList(query: string = '') {
    query = query.toLowerCase()
    this.cleanPluginList()
    this.pluginList
      .filter(p => !query || (p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)))
      .forEach(p => this.renderPlugin(p))
  }

  private cleanPluginList() {
    this.containerEl.querySelectorAll('.typ-plugin-item')
      .forEach(el => el.remove())
  }

  private renderPlugin(info: PluginMarketInfo) {
    const t = this.app.i18n.t.settingTabs.pluginMarketplace

    this.addSetting(setting => {
      setting.containerEl.classList.add('typ-plugin-item')

      setting.addName(info.name || info.id)
      setting.addDescription(`${t.author}: ${info.author}`)
      setting.addDescription(info.description)

      if (this.app.plugins.manifests[info.id]) return

      setting.addButton(button => {
        button.innerHTML = '<span class="fa fa-cloud-download"></span> ' + t.installToGlobal
        button.title = t.installToGlobalDesc
        button.classList.add('primary')
        button.onclick = () =>
          this.markettplace.installPlugin(info, 'global')
            .then(() => setting.controls.remove())
      })

      setting.addButton(button => {
        button.innerHTML = '<span class="fa fa-cloud-download"></span> ' + t.installToVault
        button.title = t.installToVaultDesc
        button.classList.add('primary')
        button.onclick = () =>
          this.markettplace.installPlugin(info, 'vault')
            .then(() => setting.controls.remove())
      })
    })
  }

}
