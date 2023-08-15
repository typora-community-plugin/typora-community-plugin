import './plugin-manager-setting-tab.scss'
import type { App } from "src/app"
import type { PluginManifest } from "src/plugin/plugin-manifest"
import { html } from "src/utils/html"
import { SettingTab } from "../setting-tab"
import { format } from 'src/utils/format'


export class PluginsManagerSettingTab extends SettingTab {

  get name() {
    return this.app.i18n.t.settingTabs.plugins.name
  }

  constructor(private app: App) {
    super()
  }

  onload() {
  }

  show() {
    this.containerEl.innerHTML = ''

    const t = this.app.i18n.t.settingTabs.plugins
    this.addSettingTitle(format(t.titleInstalled, [Object.keys(this.app.plugins.manifests).length]))

    Object.values(this.app.plugins.manifests)
      .forEach(manifest => this.renderPlugins(manifest))

    super.show()
  }

  private renderPlugins(manifest: PluginManifest) {
    const t = this.app.i18n.t.settingTabs.plugins

    this.addSetting(setting => {
      setting.addName(manifest.name || manifest.id)
      setting.addDescription(manifest.description)

      setting.containerEl.append(
        html`<div class="typ-plugin-meta-group"><div class="typ-plugin-meta">v${manifest.version}</div><div class="typ-plugin-meta">by ${manifest.author}</div></div>`)

      setting.addCheckbox(checkbox => {
        checkbox.checked = this.app.plugins.enabledPlugins[manifest.id]
        checkbox.onclick = () => {
          checkbox.checked
            ? this.app.plugins.enablePlugin(manifest.id)
            : this.app.plugins.disablePlugin(manifest.id)
        }
      })

      setting.addButton(button => {
        button.classList.add('danger')
        button.title = t.uninstall
        button.innerHTML = '<span class="fa fa-trash-o"></span>'
        button.onclick = () => {
          this.app.plugins.uninstallPlugin(manifest.id)
            .then(() => setting.containerEl.remove())
        }
      })
    })
  }
}
