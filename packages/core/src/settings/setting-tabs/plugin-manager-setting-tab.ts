import './plugin-manager-setting-tab.scss'
import type { App } from "src/app"
import { Notice } from 'src/components/notice'
import type { PluginManifest } from "src/plugin/plugin-manifest"
import { SettingTab } from "../setting-tab"
import { debounce } from "src/utils/debounce"
import { format } from 'src/utils/format'
import * as versions from "src/utils/versions"


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
        input.oninput = debounce(() => {
          this.renderPluginList(input.value)
        }, 500)
      })
    })

    this.addSetting(setting => {
      setting.addTitle(format(t.titleInstalled, [Object.keys(this.app.plugins.manifests).length]))

      setting.addButton(button => {
        button.title = t.checkForUpdate
        button.innerHTML = '<span class="fa fa-refresh"></span>'
        button.onclick = () => {
          button.disabled = true
          this.checkForUpdate().then(() => button.disabled = false)
        }
      })
    })

    this.renderPluginList()

    super.show()
  }

  hide() {
    this.containerEl.innerHTML = ''
    super.hide()
  }

  private async checkForUpdate() {
    const { manifests, marketplace } = this.app.plugins
    const ids = Object.keys(manifests)
    const text = this.app.i18n.t.settingTabs.plugins.checkingForUpdate
    const notice = new Notice(format(text, [0, ids.length]), 0)

    if (!marketplace.isLoaded) {
      await marketplace.loadCommunityPlugins()
    }

    for (const i in ids) {
      const id = ids[i]
      const info = marketplace.getPlugin(id)

      if (!info) continue

      const version = await marketplace.getPluginNewestVersion(info)
      const manifest = manifests[id]

      if (versions.compare(manifest.version, version) < 0) {
        info.newestVersion = version
        $(`.typ-plugin-item[data-id="${id}"] button:has(.fa-repeat)`, this.containerEl).show()
      }

      notice.message = format(text, [+i + 1, ids.length])
    }

    notice.hide()
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
      const info = marketplace.getPlugin(manifest.id)
      const isInMarketplace = !!info

      setting.containerEl.classList.add('typ-plugin-item')
      setting.containerEl.dataset.id = manifest.id

      setting.addName(manifest.name || manifest.id)

      if (!isInMarketplace) {
        setting.addBadge('<span class="fa fa-hdd-o" title="Local Plugin"></span>')
      }

      setting.addDescription(el => {
        $(el).append(
          `<div class="typ-plugin-meta"><span class="fa fa-folder"></span> ${manifest.postion}</div>`,

          `<div class="typ-plugin-meta"><span class="fa fa-cube"></span> v${manifest.version}</div>`,

          `<div class="typ-plugin-meta"><span class="fa fa-user"></span> ${manifest.author}</div>`,

          manifest.repo &&
          $(`<div class="typ-plugin-meta"><span class="fa fa-github"></span> <a>Repository</a></div>`)
            .on('click', () => this.app.openLink('https://github.com/' + manifest.repo)),
        )
      })

      setting.addDescription(manifest.description)

      setting.addCheckbox(checkbox => {
        checkbox.checked = plugins.enabledPlugins[manifest.id]
        checkbox.onclick = () => {
          checkbox.checked
            ? plugins.enablePlugin(manifest.id)
            : plugins.disablePlugin(manifest.id)
        }
      })

      setting.addButton(button => {
        if (!isInMarketplace || !info.newestVersion) {
          button.style.display = 'none'
        }

        button.classList.add('primary')
        button.title = t.update
        button.innerHTML = '<span class="fa fa-repeat"></span>'
        button.onclick = () => {
          plugins.updatePlugin(manifest.id)
            .then(() => {
              const info = marketplace.getPlugin(manifest.id)
              info.newestVersion = undefined
              this.renderPluginList()
            })
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
