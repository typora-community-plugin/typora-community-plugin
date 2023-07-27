import * as _ from 'lodash'
import type { App } from "src/app"
import { SettingTab } from "../setting-tab"


export type AppearanceSettings = {
  showRibbon: boolean
  showFileTabs: boolean
  showSearchResultFullPath: boolean
}

const DEFAULT_SETTINGS: AppearanceSettings = {
  showRibbon: true,
  showFileTabs: true,
  showSearchResultFullPath: false,
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
    const t = this.app.i18n.t.settingTabs.appearance

    this.addSettingTitle(t.search)
    this.addSetting(setting => {
      setting.addName(t.searchResultFullPath)
      setting.addDescription(t.searchResultFullPathDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = this.app.settings.get('showSearchResultFullPath')
        checkbox.addEventListener('click', event => {
          const el = event.target as HTMLInputElement
          this.app.settings.set('showSearchResultFullPath', el.checked)
        })
      })
    })

    this.addSettingTitle(t.advanced)
    this.addSetting(setting => {
      setting.addName(t.ribbon)
      setting.addDescription(t.ribbonDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = this.app.settings.get('showRibbon')
        checkbox.addEventListener('click', event => {
          const el = event.target as HTMLInputElement
          this.app.settings.set('showRibbon', el.checked)
        })
      })
    })
    this.addSetting(setting => {
      setting.addName(t.fileTabs)
      setting.addDescription(t.fileTabsDesc)
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
