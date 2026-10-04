import './about-tab.scss'
import path from 'src/path'
import { coreDir, coreVersion, isDebug } from 'src/common/constants'
import { Notice } from 'src/ui/components/notice'
import fs from 'src/io/fs/filesystem'
import { ExpandableSection } from "src/ui/settings/expandable-section"
import { SettingTab } from "src/ui/settings/setting-tab"
import * as versions from 'src/utils/versions'
import * as net from 'src/net/net'
import { useService } from 'src/common/service'

const CORE_NAME = 'typora-community-plugin'
const CORE_REPO = `${CORE_NAME}/${CORE_NAME}`

const THREE_DAYS = process.env.IS_DEV ? 0 : 3 * 24 * 60 * 60 * 1000


export type CoreSettings = {
  displayLang: string
  debugDownloadUrl: string
  autoCheckForUpdates: boolean
}

const LANG_NAMES: Record<string, string> = {
  'zh-cn': '简体中文',
  en: 'English',
  de: 'Deutsch',
}


export class AboutTab extends SettingTab {

  private updateAvailable = false
  private latestVersion: string | undefined
  private updateBadgeEl: HTMLElement | undefined

  get name() {
    return this.i18n.t.settingTabs.about.name
  }

  constructor(
    config = useService('config-repository'),
    private logger = useService('logger', ['AboutTab']),
    private settings = useService('settings'),
    private i18n = useService('i18n'),
    private github = useService('github'),
    private mdRenderer = useService('markdown-renderer'),
    private settingsModal = useService('settings-modal'),
  ) {
    super()

    settings.setDefault({
      displayLang: i18n.locale,
      autoCheckForUpdates: true,
    })

    this.render()
    config.on('switch', () => {
      this.containerEl.innerHTML = ''
      this.render()
    })

    settingsModal.once('open', () => this.checkUpdateDaily())

    settings.onChange('autoCheckForUpdates', enabled => {
      enabled ? this.checkUpdateDaily() : this.setUpdateState(false)
    })
  }

  render() {
    const t = this.i18n.t.settingTabs.about

    this.addSettingTitle(this.name)

    this.addSetting(setting => {
      setting.addName('Typora Community Plugin')
      setting.addBadge(el => {
        el.className = 'typ-update-badge'
        this.updateBadgeEl = el
        this.refreshUpdateBadge()
      })

      setting.addDescription(el => {
        const typoraUrl = '<a href="https://typora.io">Typora</a>'
        const authorUrl = '<a href="https://github.com/plylrnsdy">plylrnsdy</a>'
        const repoUrl = '<a href="https://github.com/typora-community-plugin/typora-community-plugin">typora-community-plugin</a>'

        $(el).append(
          `${t.projectDesc} `, typoraUrl, '<br>',
          `${t.labelVersion}: v${coreVersion()}<br>`,
          `${t.labelBuildTime}: ${process.env.BUILD_TIME}<br>`,
          `${t.labelAuthor}: `, authorUrl, '<br>',
          `${t.labelHomepage}: `, repoUrl,
        )
      })

      new ExpandableSection({
        iconClass: 'fa-history',
        title: t.changelogViewDesc,
        labelView: t.changelogView,
        labelCollapse: t.changelogCollapse,
        labelLoading: t.changelogLoading,
        labelNotFound: t.changelogNotFound,
        fetchContent: () => this.fetchChangelog(),
        mdRenderer: this.mdRenderer,
      }).addButtonTo(setting)

      setting.addButton(button => {
        button.classList.add('primary')
        button.innerText = t.buttonUpdate
        button.onclick = () => {
          button.disabled = true
          this.updateCore()
            .finally(() => button.disabled = false)
        }
      })
    })

    if (process.env.IS_DEV || isDebug())
      this.addSetting(setting => {
        setting.addName(t.debugDownloadUrl)
        setting.addDescription(t.debugDownloadUrlDesc)
        setting.addText(el => {
          el.placeholder = 'https://example.com/update.zip'
          const saved = this.settings.get('debugDownloadUrl')
          if (saved) el.value = saved
          $(el).on('change', e => {
            this.settings.set('debugDownloadUrl', $(e.target).val()?.toString() ?? '')
          })
        })
        setting.addButton(button => {
          button.classList.add('primary')
          button.innerText = t.buttonUpdate
          button.onclick = () => {
            const url = this.settings.get('debugDownloadUrl')
            if (url) {
              button.disabled = true
              this.installCore(url)
                .finally(() => button.disabled = false)
            } else {
              Notice.info(t.debugDownloadEmpty)
            }
          }
        })
      })

    this.addSetting(setting => {
      setting.addName(t.autoCheckForUpdates)
      setting.addCheckbox({ settings: this.settings, bindingKey: 'autoCheckForUpdates' })
    })

    this.addSetting(async setting => {
      setting.addName(t.lang)
      setting.addDescription(t.langDesc)
      setting.addSelect(async el => {
        const files = await fs.list(path.join(coreDir(), 'locales'))

        const selected = this.settings.get('displayLang')
        const select = (opt: string) => opt === selected ? 'selected' : ''
        const options = files
          .map(name => name.slice(5, -5))
          .map(name => `<option value="${name}" ${select(name)}>${LANG_NAMES[name] ?? name}</option>`)

        $(el)
          .append(...options)
          .on('change', e => {
            this.settings.set('displayLang', $(e.target).val()?.toString() ?? '')
          })
      })
    })
  }

  updateCore() {
    const t = this.i18n.t.settingTabs.about
    return this.github.getReleaseInfo(CORE_REPO)
      .then(data => data.tag_name)
      .then(version => {
        if (versions.compare(coreVersion(), version) < 0) {
          const url = this.github.getReleaseUrl(CORE_REPO, version, `${CORE_NAME}.zip`)
          return this.installCore(url)
        }
        else {
          Notice.info(t.coreUpToDate)
        }
      })
      .catch(error => {
        this.logger.error(error)
        Notice.error(error.message, 0)
      })
  }

  private fetchChangelog(): Promise<string | undefined> {
    const locale = this.i18n.locale.toLowerCase()
    const paths: string[] = []
    if (locale) paths.push(`docs/${locale}/user-guide/CHANGELOG.md`)
    paths.push('docs/en-us/user-guide/CHANGELOG.md')

    const fetchNext = (i: number): Promise<string | undefined> =>
      i >= paths.length ? Promise.resolve(undefined)
        : this.github.getFileText(CORE_REPO, 'main', paths[i]).then(md => md || fetchNext(i + 1))
    return fetchNext(0)
  }

  installCore(url: string) {
    return net.downloadThenUnzipToTemp(url)
      .then(async tmp => {
        const root = path.join(coreDir(), '..')
        const files = await fs.list(tmp)
        return Promise.all(files.map(f => fs.move(path.join(tmp, f), path.join(root, f))))
      })
      .then(() => {
        const t = this.i18n.t.settingTabs.about
        Notice.success(t.coreUpdateSuccessful)
      })
  }

  private checkUpdateDaily() {
    if (!this.settings.get('autoCheckForUpdates')) return

    this.github.getReleaseInfo(CORE_REPO)
      .then(data => {
        const publishedAt = new Date(data.published_at).getTime()
        const isNewer = versions.compare(coreVersion(), data.tag_name) < 0
        this.setUpdateState(isNewer && (Date.now() - publishedAt > THREE_DAYS), data.tag_name)
      })
      .catch(error => this.logger.error(error))
  }

  private setUpdateState(available: boolean, version?: string) {
    this.updateAvailable = available
    this.latestVersion = version
    this.settingsModal.setTabPill(this, available ? 'New' : undefined)
    this.refreshUpdateBadge()
  }

  private refreshUpdateBadge() {
    if (!this.updateBadgeEl) return

    this.updateBadgeEl.textContent = this.updateAvailable ? this.i18n.t.settingTabs.about.hasUpdate : ''
    this.updateBadgeEl.title = this.latestVersion ? `v${this.latestVersion}` : ''
  }
}
