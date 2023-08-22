import './plugin-manager-setting-tab.scss'
import * as _ from 'lodash'
import type { App } from "src/app"
import type { PluginManifest } from "src/plugin/plugin-manifest"
import { SettingTab } from "../setting-tab"
import { format } from 'src/utils/format'
import { html } from "src/utils/html"


export class PluginsManagerSettingTab extends SettingTab {

  get name() {
    return this.app.i18n.t.settingTabs.plugins.name
  }

  constructor(private app: App) {
    super()
  }

  show() {
    const t = this.app.i18n.t.settingTabs.plugins

    this.addSetting(setting => {
      setting.addName(t.searchPlugin)
      setting.addText(input => {
        input.oninput = _.debounce(() => {
          this.renderPluginList(input.value)
        }, 500)
      })
    })

    this.addSettingTitle(format(t.titleInstalled, [Object.keys(this.app.plugins.manifests).length]))

    this.renderPluginList()

    super.show()
  }

  hide() {
    this.containerEl.innerHTML = ''
    super.hide()
  }

  private renderPluginList(query: string = '') {
    query = query.toLowerCase()
    this.cleanPluginList()
    Object.values(this.app.plugins.manifests)
      .filter(p => !query || (p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)))
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(p => this.renderPlugin(p))
  }

  private cleanPluginList() {
    this.containerEl.querySelectorAll('.typ-plugin-item')
      .forEach(el => el.remove())
  }

  private renderPlugin(manifest: PluginManifest) {
    const { plugins } = this.app
    const { marketplace } = plugins
    const t = this.app.i18n.t.settingTabs.plugins

    this.addSetting(setting => {
      const isInMarketplace = marketplace.pluginList.find(p => p.id === manifest.id)

      setting.containerEl.classList.add('typ-plugin-item')

      setting.addName(manifest.name || manifest.id)

      if (!isInMarketplace) {
        setting.addBadge('Local')
      }

      setting.addDescription(manifest.description)

      setting.containerEl.append(
        html`<div class="typ-plugin-meta-group"><div class="typ-plugin-meta"><span class="fa fa-code"> </span> v${manifest.version}</div><div class="typ-plugin-meta"><span class="fa fa-user"></span> ${manifest.author}</div><div class="typ-plugin-meta"><span class="fa fa-folder-o"></span> ${manifest.postion}</div></div>`)

      setting.addCheckbox(checkbox => {
        checkbox.checked = plugins.enabledPlugins[manifest.id]
        checkbox.onclick = () => {
          checkbox.checked
            ? plugins.enablePlugin(manifest.id)
            : plugins.disablePlugin(manifest.id)
        }
      })

      setting.addButton(button => {
        if (isInMarketplace) {
          button.disabled = true
        }
        button.classList.add('primary')
        button.title = t.update
        button.innerHTML = '<span class="fa fa-repeat"></span>'
        button.onclick = () => {
          plugins.updatePlugin(manifest.id)
            .then(() => this.renderPluginList())
        }
      })

      setting.addButton(button => {
        button.classList.add('danger')
        button.title = t.uninstall
        button.innerHTML = '<span class="fa fa-trash-o"></span>'
        button.onclick = () => {
          plugins.uninstallPlugin(manifest.id)
            .then(() => setting.containerEl.remove())
        }
      })
    })
  }
}
