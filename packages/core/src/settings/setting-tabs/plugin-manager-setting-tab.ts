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
      .forEach(p => this.renderPlugin(p))
  }

  private cleanPluginList() {
    this.containerEl.querySelectorAll('.typ-plugin-item')
      .forEach(el => el.remove())
  }

  private renderPlugin(manifest: PluginManifest) {
    const { plugins } = this.app
    const t = this.app.i18n.t.settingTabs.plugins

    this.addSetting(setting => {
      setting.containerEl.classList.add('typ-plugin-item')

      setting.addName(manifest.name || manifest.id)
      setting.addDescription(manifest.description)

      setting.containerEl.append(
        html`<div class="typ-plugin-meta-group"><div class="typ-plugin-meta">v${manifest.version}</div><div class="typ-plugin-meta">by ${manifest.author}</div></div>`)

      setting.addCheckbox(checkbox => {
        checkbox.checked = plugins.enabledPlugins[manifest.id]
        checkbox.onclick = () => {
          checkbox.checked
            ? plugins.enablePlugin(manifest.id)
            : plugins.disablePlugin(manifest.id)
        }
      })

      setting.addButton(button => {
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
