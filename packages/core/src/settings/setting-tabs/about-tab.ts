import path from 'src/path'
import type { App } from "src/app"
import { Notice } from 'src/components/notice'
import fs from 'src/fs/filesystem'
import { Logger } from 'src/logger'
import { SettingTab } from "src/settings/setting-tab"
import * as versions from 'src/utils/versions'
import { HttpClient } from 'src/net/http-client'


const logger = new Logger('AboutTab')


export type CoreSettings = {
  displayLang: string
}

export class AboutTab extends SettingTab {

  get name() {
    return this.app.i18n.t.settingTabs.about.name
  }

  constructor(private app: App) {
    super()

    app.settings.setDefault({ displayLang: app.i18n.locale })
  }

  onload() {
    const t = this.app.i18n.t.settingTabs.about

    this.addSettingTitle(this.name)

    this.addSetting(setting => {
      setting.addName('Typora Community Plugin')
      setting.addDescription(el => {
        $(el).append([
          `${t.projectDesc} <a href="https://typora.io">Typora</a>`,
          `${t.labelVersion}: v${this.app.coreVersion}`,
          `${t.labelBuildTime}: ${process.env.BUILD_TIME}`,
          `${t.labelAuthor}: <a href="https://github.com/plylrnsdy">plylrnsdy</a>`,
          `${t.labelHomepage}: <a href="https://github.com/typora-community-plugin/typora-community-plugin">typora-community-plugin</a>`,
        ].join('<br>'))
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
        const files = await fs.list(path.join(this.app.coreDir, 'locales'))

        const selected = this.app.settings.get('displayLang')
        const select = (opt: string) => opt === selected ? 'selected' : ''
        const options = files
          .map(name => name.slice(5, -5))
          .map(name => `<option ${select(name)}>${name}</option>`)

        $(el)
          .append(...options)
          .on('change', e => {
            this.app.settings.set('displayLang', $(e.target).val().toString())
          })
      })
    })
  }

  updateCore() {
    const t = this.app.i18n.t.settingTabs.about
    const name = 'typora-community-plugin'
    const repo = `${name}/${name}`
    return this.app.github.getReleaseInfo(repo)
      .then(data => data.tag_name)
      .then(version => {
        if (versions.compare(this.app.coreVersion, version) < 0) {
          const url = this.app.github.getReleaseUrl(repo, version, name)
          return this.installCore(url)
        }
        else {
          new Notice(t.coreUpToDate)
        }
      })
      .catch(error => {
        logger.error(error)
        new Notice(error.message)
      })
  }

  installCore(url: string) {
    return HttpClient.downloadThenUnzipToTemp(url)
      .then(async tmp => {
        const root = path.join(this.app.coreDir, '..')
        const files = await fs.list(tmp)
        return Promise.all(files.map(f => fs.move(path.join(tmp, f), path.join(root, f))))
      })
      .then(() => {
        const t = this.app.i18n.t.settingTabs.about
        new Notice(t.coreUpdateSuccessful)
      })
  }
}
