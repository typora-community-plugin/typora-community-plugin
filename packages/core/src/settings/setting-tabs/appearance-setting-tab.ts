import * as _ from 'lodash'
import type { App } from "src/app"
import { SettingTab } from "../setting-tab"


export type AppearanceSettings = {
  showNotSupportedFile: boolean
  showSearchResultFullPath: boolean
  showRibbon: boolean
  showFileTabs: boolean
}

const DEFAULT_SETTINGS: AppearanceSettings = {
  showNotSupportedFile: false,
  showSearchResultFullPath: false,
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
    const { settings } = this.app
    const t = this.app.i18n.t.settingTabs.appearance

    this.addSettingTitle(t.fileExplorer)
    this.addSetting(setting => {
      setting.addName(t.showNotSupportedFile)
      setting.addDescription(t.showNotSupportedFileDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('showNotSupportedFile')
        checkbox.addEventListener('click', event => {
          const el = event.target as HTMLInputElement
          settings.set('showNotSupportedFile', el.checked)
        })
      })
    })

    this.addSettingTitle(t.search)
    this.addSetting(setting => {
      setting.addName(t.searchResultFullPath)
      setting.addDescription(t.searchResultFullPathDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('showSearchResultFullPath')
        checkbox.addEventListener('click', event => {
          const el = event.target as HTMLInputElement
          settings.set('showSearchResultFullPath', el.checked)
        })
      })
    })

    this.addSettingTitle(t.advanced)
    this.addSetting(setting => {
      setting.addName(t.ribbon)
      setting.addDescription(t.ribbonDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('showRibbon')
        checkbox.addEventListener('click', event => {
          const el = event.target as HTMLInputElement
          settings.set('showRibbon', el.checked)
        })
      })
    })
    this.addSetting(setting => {
      setting.addName(t.fileTabs)
      setting.addDescription(t.fileTabsDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('showFileTabs')
        checkbox.addEventListener('click', event => {
          const el = event.target as HTMLInputElement
          settings.set('showFileTabs', el.checked)
        })
      })
    })
  }

  onunload() {
    this.containerEl.remove()
  }
}
