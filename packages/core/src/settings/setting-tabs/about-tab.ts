import * as fs from 'fs'
import * as path from 'path'
import type { App } from "src/app"
import { SettingTab } from "../setting-tab"
import { unzipFromBuffer } from 'src/utils/unzip'
import * as versions from 'src/utils/versions'
import { Notice } from 'src/components/notice'


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

    this.addSetting(setting => {
      setting.addName(t.lang)
      setting.addDescription(t.langDesc)
      setting.addSelect({
        options: fs.readdirSync(path.join(this.app.coreDir, 'locales'))
          .map(name => name.slice(5, -5)),
        selected: this.app.settings.get('displayLang'),
        onchange: event => {
          this.app.settings.set('displayLang', event.target.value)
        },
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
          return this.app.github.download(repo, version, `${name}.zip`)
            .then(res => res.arrayBuffer())
            .then(arrBuf => {
              const buf = Buffer.from(arrBuf)
              const root = path.join(this.app.coreDir, '..')
              return unzipFromBuffer(buf, root)
                .then(() => { new Notice(t.coreUpdateSuccessful) })
            })
        }
        else {
          new Notice(t.coreUpToDate)
        }
      })
  }

}
