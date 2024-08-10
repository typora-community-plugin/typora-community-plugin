import path from 'src/path'
import { coreDir, coreVersion } from 'src/common/constants'
import { Notice } from 'src/ui/components/notice'
import fs from 'src/io/fs/filesystem'
import { SettingTab } from "src/ui/settings/setting-tab"
import * as versions from 'src/utils/versions'
import { HttpClient } from 'src/net/http-client'
import { useService } from 'src/common/service'


export type CoreSettings = {
  displayLang: string
}


export class AboutTab extends SettingTab {

  get name() {
    return this.i18n.t.settingTabs.about.name
  }

  constructor(
    private logger = useService('logger', ['AboutTab']),
    private settings = useService('settings'),
    private i18n = useService('i18n'),
    private github = useService('github')
  ) {
    super()

    settings.setDefault({ displayLang: i18n.locale })
  }

  onload() {
    const t = this.i18n.t.settingTabs.about

    this.addSettingTitle(this.name)

    this.addSetting(setting => {
      setting.addName('Typora Community Plugin')

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

    this.addSetting(async setting => {
      setting.addName(t.lang)
      setting.addDescription(t.langDesc)
      setting.addSelect(async el => {
        const files = await fs.list(path.join(coreDir(), 'locales'))

        const selected = this.settings.get('displayLang')
        const select = (opt: string) => opt === selected ? 'selected' : ''
        const options = files
          .map(name => name.slice(5, -5))
          .map(name => `<option ${select(name)}>${name}</option>`)

        $(el)
          .append(...options)
          .on('change', e => {
            this.settings.set('displayLang', $(e.target).val().toString())
          })
      })
    })
  }

  updateCore() {
    const t = this.i18n.t.settingTabs.about
    const name = 'typora-community-plugin'
    const repo = `${name}/${name}`
    return this.github.getReleaseInfo(repo)
      .then(data => data.tag_name)
      .then(version => {
        if (versions.compare(coreVersion(), version) < 0) {
          const url = this.github.getReleaseUrl(repo, version, `${name}.zip`)
          return this.installCore(url)
        }
        else {
          new Notice(t.coreUpToDate)
        }
      })
      .catch(error => {
        this.logger.error(error)
        new Notice(error.message)
      })
  }

  installCore(url: string) {
    return HttpClient.downloadThenUnzipToTemp(url)
      .then(async tmp => {
        const root = path.join(coreDir(), '..')
        const files = await fs.list(tmp)
        return Promise.all(files.map(f => fs.move(path.join(tmp, f), path.join(root, f))))
      })
      .then(() => {
        const t = this.i18n.t.settingTabs.about
        new Notice(t.coreUpdateSuccessful)
      })
  }
}
