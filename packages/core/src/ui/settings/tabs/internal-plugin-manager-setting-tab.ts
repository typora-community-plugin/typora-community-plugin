import { useService } from "src/common/service"
import { SettingTab } from "../setting-tab"
import type { InternalPluginManifest } from "src/plugin-internal/internal-plugin"


export class InternalPluginsManagerSettingTab extends SettingTab {

  get name() {
    return this.i18n.t.settingTabs.internalPlugins.name
  }

  constructor(
    config = useService('config-repository'),
    private plugins = useService('internal-plugin-manager'),
    private i18n = useService('i18n'),
  ) {
    super()

    setTimeout(() => this.render(), 1e3)
    config.on('switch', () => {
      this.containerEl.innerHTML = ''
      this.render()
    })
  }

  onshow() {
    this.containerEl.innerHTML = ''
    this.render()
  }

  render() {
    Object.values(this.plugins.manifests)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(p => this.renderPlugin(p))
  }


  private renderPlugin(manifest: InternalPluginManifest) {
    const { plugins } = this
    const t = this.i18n.t.settingTabs.plugins

    this.addSetting(setting => {
      setting.containerEl.classList.add('typ-plugin-item')
      setting.containerEl.dataset.id = manifest.id

      setting.addName(manifest.name || manifest.id)
      setting.addDescription(manifest.description)

      setting.addCheckbox(checkbox => {
        checkbox.checked = plugins.enabledPlugins[manifest.id]
        checkbox.onclick = () => {
          checkbox.checked
            ? plugins.enablePlugin(manifest.id)
            : plugins.disablePlugin(manifest.id)
        }
      })
    })
  }
}
