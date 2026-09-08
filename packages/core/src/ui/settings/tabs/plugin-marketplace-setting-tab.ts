import './plugin-marketplace-setting-tab.scss'
import { useService } from "src/common/service"
import { platform } from "src/common/constants"
import path from 'src/path'
import type { PluginMarketInfo, PluginReadme } from "src/plugin/plugin-marketplace"
import { SettingTab } from "../setting-tab"
import { debounce, format, html } from "src/utils"
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
    private mdRenderer = useService('markdown-renderer'),
  ) {
    super()

    settings.onChange('githubProxy', () => {
      this.removeRenderedReadmes()
      this.marketplace.clearReadmeCache()
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

  private _loadPromise: Promise<void> | undefined
  private _pluginListVersion = 0

  private loadPluginList() {
    const version = ++this._pluginListVersion

    this.cleanPluginList()
    if (!this._loadPromise) {
      this._loadPromise = this.marketplace.loadCommunityPlugins().finally(() => {
        this._loadPromise = undefined
      })
    }

    return this._loadPromise.then(() => {
      if (version === this._pluginListVersion)
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

  private removeRenderedReadmes() {
    this.containerEl.querySelectorAll('.typ-plugin-item > .typ-plugin-readme-section')
      .forEach(el => el.remove())
  }

  private renderPlugin(info: PluginMarketInfo) {
    const t = this.i18n.t.settingTabs.pluginMarketplace

    this.addSetting(setting => {
      setting.containerEl.classList.add('typ-plugin-item')

      setting.addName(info.name || info.id)
      setting.addDescription(el => {
        const stats = this.marketplace.pluginStats[info.id]
        const downloads = stats ? stats.downloads.toLocaleString() : null
        const size = stats ? formatFileSize(stats.size) : null
        const lastUpdate = stats?.updated ? formatDate(stats.updated) : null

        $(el).append(
          `<span class="typ-plugin-meta"><span class="fa fa-user"></span> ${info.author}</span>`,

          $(`<span class="typ-plugin-meta"><span class="fa fa-github"></span> <a href="https://github.com/${info.repo}">Repository</a></span>`),

          lastUpdate ? `<span class="typ-plugin-meta" title="${t.lastUpdate}"><span class="fa fa-clock-o"></span> ${lastUpdate}</span>` : '',

          size ? `<span class="typ-plugin-meta" title="${t.size}"><span class="fa fa-file-archive-o"></span> ${size}</span>` : '',

          downloads ? `<span class="typ-plugin-meta" title="${t.downloads}"><span class="fa fa-download"></span> ${downloads}</span>` : '',

          `<span class="typ-plugin-meta">OS: ${info.platforms.map(p => `<span class="fa fa-${platformIcons[p]}"></span>`).join(' ')}</span>`,
        )
      })
      setting.addDescription(info.description)

      let readmeSection: HTMLElement | undefined
      let readmeEl: HTMLElement | undefined
      setting.addButton(button => {
        button.innerHTML = '<span class="fa fa-book"></span> ' + t.readmeView
        button.title = t.readmeViewDesc

        const resetButton = () => {
          button.disabled = false
          button.innerHTML = `<span class="fa fa-book"></span> ${t.readmeView}`
        }

        const setToggleLabel = () => {
          button.innerHTML = `<span class="fa fa-book"></span> ${readmeEl?.classList.contains('collapsed') ? t.readmeView : t.readmeCollapse}`
        }

        button.onclick = () => {
          if (readmeSection && readmeEl) {
            readmeEl.classList.toggle('collapsed')
            setToggleLabel()
            return
          }

          button.disabled = true
          button.innerHTML = `<span class="fa fa-spinner fa-spin"></span> ${t.readmeLoading}`

          this.marketplace.getPluginReadme(info)
            .then(readme => {
              if (!readme || !button.isConnected) {
                if (button.isConnected && readme === undefined) Notice.error(t.readmeNotFound)
                resetButton()
                return
              }

              const contentEl = html`<div class="typ-plugin-readme-content"></div>`
              readmeEl = html`<div class="typ-plugin-readme collapsed"></div>`
              readmeSection = html`<div class="typ-plugin-readme-section with-readme"></div>`
              readmeEl.append(contentEl)
              readmeSection.append(readmeEl!)
              setting.containerEl.append(readmeSection)
              this.mdRenderer.renderTo(this.resolveReadmeUrls(info, readme), contentEl)
              button.disabled = false
              requestAnimationFrame(() => {
                readmeEl!.classList.remove('collapsed')
                setToggleLabel()
              })
            })
            .catch(resetButton)
        }
      })

      if (!info.platforms.includes(platform())) return
      if (this.plugins.manifests[info.id]) return

      setting.addButton(button => {
        button.innerHTML = '<span class="fa fa-cloud-download"></span> ' + t.installToGlobal
        button.title = t.installToGlobalDesc
        button.classList.add('primary')
        button.onclick = () => {
          button.disabled = true
          this.installPlugin(info, 'global')
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
          this.installPlugin(info, 'vault')
            .then(() => setting.controls.remove())
            .catch(() => button.disabled = false)
        }
      })
    })
  }

  /**
   * Rewrite relative image/link references in README markdown to absolute URLs of the repository.
   */
  private resolveReadmeUrls(info: PluginMarketInfo, readme: PluginReadme): string {
    const dir = path.dirname(readme.filepath)
    const rawBase = this.github.rawUrl + info.repo + '/' + readme.branch + '/'
    const webBase = this.github.baseUrl + info.repo + '/blob/' + readme.branch + '/'

    const toAbsoluteRef = (ref: string, base: string): string | null => {
      if (!ref || ref.startsWith('#') || isProtocolRef(ref)) return null
      const target = ref.startsWith('/') ? ref.slice(1) : resolveRelativePath(dir, ref)
      return target ? base + target : null
    }

    let md = readme.md
      .replace(/(^|[^!("'=`])!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g, (match, prefix, alt, src) => {
        const url = toAbsoluteRef(src.trim(), rawBase)
        return url ? `${prefix}![${alt}](${url})` : match
      })

    md = md.replace(/(^|[^!("'=`])\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g, (match, prefix, label, href) => {
      const url = toAbsoluteRef(href.trim(), webBase)
      return url ? `${prefix}[${label}](${url})` : match
    })

    return md
  }

  private async installPlugin(info: PluginMarketInfo, pos: 'global' | 'vault') {
    const t = this.i18n.t.pluginMarketplace
    await this.marketplace.installPlugin(info, pos)
      .then(() => { Notice.success(format(t.installSuccessful, info)) })
  }

}


/**
 * Returns true when the reference has a protocol (http:, https:, data:, mailto:, //cdn… etc.) and must not be rewritten.
 */
function isProtocolRef(ref: string) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref)
}

/**
 * Resolve a path relative to `baseDir`, normalizing `.` and `..` segments. Returns null if it escapes the root.
 */
function resolveRelativePath(baseDir: string, target: string): string | null {
  const base = (baseDir === '' || baseDir === '.' ? [] : baseDir.split(/[\\\/]+/).filter(Boolean))
    .map(s => s.toLowerCase())

  let segments = [...base]

  for (const seg of target.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') {
      if (!segments.length) return null
      segments.pop()
    } else {
      segments.push(seg)
    }
  }

  return segments.join('/')
}


function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
