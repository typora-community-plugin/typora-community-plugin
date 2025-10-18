import { useService } from "src/common/service"
import { platform } from "src/common/constants"
import type { PluginMarketInfo } from "src/plugin/plugin-marketplace"
import { SettingTab } from "../setting-tab"
import { debounce, format, uniqueId } from "src/utils"
import { Downloader } from "src/net/net"
import { File } from "typora"
import { Notice } from "src/ui/components/notice"


const platformIcons: Record<string, string> = {
  darwin: 'apple',
  linux: 'linux',
  win32: 'windows',
}

export type PluginMarketplaceSettings = {
  downloader: string
  githubProxy: string
}

export const DEFAULT_PLUGIN_MARKETPLACE_SETTINGS: PluginMarketplaceSettings = {
  downloader: File.isNode ? 'Typora' : 'CLI',
  githubProxy: 'github',
}

export class PluginMarketplaceSettingTab extends SettingTab {

  get name() {
    return this.i18n.t.settingTabs.pluginMarketplace.name
  }

  constructor(
    private config = useService('config-repository'),
    private settings = useService('settings'),
    private i18n = useService('i18n'),
    private github = useService('github'),
    private plugins = useService('plugin-manager'),
    private marketplace = useService('plugin-marketplace'),
  ) {
    super()

    settings.onChange('githubProxy', () => {
      this.loadPluginList()
    })

    this.render()
    config.on('switch', () => {
      this.containerEl.innerHTML = ''
      this.render()
    })
  }

  render() {
    const { settings } = this
    const t = this.i18n.t.settingTabs.pluginMarketplace

    if (File.isNode)
      this.addSetting(setting => {
        setting.addName(t.downloader)
        setting.addDescription(t.downloaderDesc)
        setting.addSelect({
          options: Object.values(Downloader).filter(d => d !== 'CLI'),
          selected: settings.get('downloader'),
          onchange: event => settings.set('downloader', event.target.value)
        })
      })

    this.addSetting(setting => {
      setting.addName(t.githubProxy)
      setting.addDescription(t.githubProxyDesc)
      setting.addSelect({
        options: this.github.proxies.map(u => u.id),
        selected: settings.get('githubProxy'),
        onchange: event => settings.set('githubProxy', event.target.value)
      })
    })

    this.addSetting(setting => {
      setting.addName(t.searchPlugin)
      setting.addText(input => {
        input.oninput = debounce(() => {
          this.cleanPluginList()
          this.renderPluginList(input.value)
        }, 500)
      })
    })

    this.addSetting(setting => {
      setting.addTitle(t.pluginList)
      setting.addButton(button => {
        button.title = t.reloadPluginList
        button.innerHTML = '<span class="fa fa-refresh"></span>'
        button.onclick = () => this.loadPluginList()
      })
    })
  }

  onshow() {
    this.loadPluginList()
  }

  private _pluginListVersion = 0

  private loadPluginList() {
    const version = +uniqueId()

    this.cleanPluginList()
    this.marketplace.loadCommunityPlugins()
      .then(() => {
        if (version <= this._pluginListVersion) return
        this._pluginListVersion = version
        this.renderPluginList()
      })
  }

  private renderPluginList(query: string = '') {
    query = query.toLowerCase()
    this.marketplace.pluginList
      .filter(p => !query || (p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)))
      .forEach(p => this.renderPlugin(p))
  }

  private cleanPluginList() {
    this.containerEl.querySelectorAll('.typ-plugin-item')
      .forEach(el => el.remove())
  }

  private renderPlugin(info: PluginMarketInfo) {
    const t = this.i18n.t.settingTabs.pluginMarketplace

    this.addSetting(setting => {
      setting.containerEl.classList.add('typ-plugin-item')

      setting.addName(info.name || info.id)
      setting.addDescription(el => {
        $(el).append(
          `<span class="typ-plugin-meta"><span class="fa fa-user"></span> ${info.author}</span>`,

          $(`<span class="typ-plugin-meta"><span class="fa fa-github"></span> <a href="https://github.com/${info.repo}">Repository</a></span>`),

          `<span class="typ-plugin-meta">OS: ${info.platforms.map(p => `<span class="fa fa-${platformIcons[p]}"></span>`).join(' ')}</span>`,
        )
      })
      setting.addDescription(info.description)

      if (!info.platforms.includes(platform())) return
      if (this.plugins.manifests[info.id]) return

      setting.addButton(button => {
        button.innerHTML = '<span class="fa fa-cloud-download"></span> ' + t.installToGlobal
        button.title = t.installToGlobalDesc
        button.classList.add('primary')
        button.onclick = () => {
          button.disabled = true
          this.marketplace.installPlugin(info, 'global')
            .then(() => setting.controls.remove())
            .catch(() => button.disabled = false)
        }
      })

      if (this.config.isUsingGlobalConfig) return

      setting.addButton(button => {
        button.innerHTML = '<span class="fa fa-cloud-download"></span> ' + t.installToVault
        button.title = t.installToVaultDesc
        button.classList.add('primary')
        button.onclick = () => {
          button.disabled = true
          this.marketplace.installPlugin(info, 'vault')
            .then(() => setting.controls.remove())
            .catch(() => button.disabled = false)
        }
      })
    })
  }

}
