import * as _ from 'lodash'
import type { App } from "src/app"
import { SettingTab } from "../setting-tab"


export type AppearanceSettings = {
  showRibbon: boolean
  showFileTabs: boolean
}

const DEFAULT_SETTINGS: AppearanceSettings = {
  showRibbon: true,
  showFileTabs: true,
}

export class AppearanceSettingTab extends SettingTab {

  get name() {
    return this.app.i18n.t.settingTabs.appearance.name
  }

  constructor(private app: App) {
    super()

    app.settings.setDefault(DEFAULT_SETTINGS)
  }

  onload() {
    const { i18n } = this.app

    this.addSetting(setting => {
      setting.addName(i18n.t.settingTabs.appearance.ribbon)
      setting.addDescription(i18n.t.settingTabs.appearance.ribbonDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = this.app.settings.get('showRibbon')
        checkbox.addEventListener('click', event => {
          const el = event.target as HTMLInputElement
          this.app.settings.set('showRibbon', el.checked)
        })
      })
    })

    this.addSetting(setting => {
      setting.addName(i18n.t.settingTabs.appearance.fileTabs)
      setting.addDescription(i18n.t.settingTabs.appearance.fileTabsDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = this.app.settings.get('showFileTabs')
        checkbox.addEventListener('click', event => {
          const el = event.target as HTMLInputElement
          this.app.settings.set('showFileTabs', el.checked)
        })
      })
    })
  }

  onunload() {
    this.containerEl.remove()
  }
}
