import type { App } from "src/app"
import { PluginMarketplace, type PluginMarketInfo } from "src/plugin/plugin-marketplace"
import { SettingTab } from "../setting-tab"


export type PluginMarketplaceSettings = {
  githubPluginListUri: string
  githubDownloadUri: string
}

const DEFAULT_SETTINGS: PluginMarketplaceSettings = {
  githubPluginListUri: 'github',
  githubDownloadUri: 'github',
}

export class PluginMarketplaceSettingTab extends SettingTab {

  get name() {
    return this.app.i18n.t.settingTabs.pluginMarketplace.name
  }

  private markettplace: PluginMarketplace

  constructor(private app: App) {
    super()

    app.settings.setDefault(DEFAULT_SETTINGS)
    app.settings.onChange('githubPluginListUri', () => {
      this.renderPluginList()
    })

    this.markettplace = new PluginMarketplace(app)
  }

  onload() {
    const t = this.app.i18n.t.settingTabs.pluginMarketplace

    this.addSettingTitle(t.githubProxy)

    this.addSetting(settings => {
      settings.addName(t.pluginListSource)
      settings.addSelect({
        options: this.markettplace.pluginListUris.map(u => u.id),
        selected: this.app.settings.get('githubPluginListUri'),
        onchange: (event) => this.app.settings.set('githubPluginListUri', event.target.value)
      })
    })

    this.addSetting(settings => {
      settings.addName(t.pluginDownloadSource)
      settings.addSelect({
        selected: this.app.settings.get('githubDownloadUri'),
        options: this.markettplace.downloadUris.map(u => u.id),
        onchange: (event) => this.app.settings.set('githubDownloadUri', event.target.value)
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
    this.markettplace.loadCommunityPlugins()
      .then(data => {
        this.cleanPluginList()
        data.forEach(p => this.renderPlugins(p))
      })
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
