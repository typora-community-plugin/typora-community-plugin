import type { App } from "src/app"
import { SettingTab } from "../setting-tab"


export class AboutTab extends SettingTab {

  get name() {
    return this.app.i18n.t.settingTabs.about.name
  }

  constructor(private app: App) {
    super()
  }

  onload() {
    const t = this.app.i18n.t.settingTabs.about

    this.addSettingTitle(this.name)
    this.addSetting(settings => {
      settings.addName(`Typora Community Plugin`)
      settings.addDescription(`${t.projectDesc} <a href="https://typora.io">Typora</a>`)
    })
    this.addSetting(settings => {
      settings.addName(`${t.labelVersion}: v${this.app.coreVersion}`)
    })
    this.addSetting(settings => {
      settings.addName(`${t.labelAuthor}: <a href="https://github.com/plylrnsdy">plylrnsdy</a>`)
    })
    this.addSetting(settings => {
      settings.addName(`${t.labelHomepage}: <a href="https://github.com/typora-community-plugin/typora-community-plugin">https://github.com/typora-community-plugin/typora-community-plugin</a>`)
    })
  }

}
