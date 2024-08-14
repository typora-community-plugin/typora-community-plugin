import { useService } from "src/common/service"
import { SettingTab } from "../setting-tab"


export type AppearanceSettings = {
  showNotSupportedFile: boolean
  keepSearchResult: boolean
  showSearchResultFullPath: boolean
  showRibbon: boolean
  showFileTabs: boolean
  hideExtensionInFileTab: boolean
}

const DEFAULT_SETTINGS: AppearanceSettings = {
  showNotSupportedFile: false,
  keepSearchResult: false,
  showSearchResultFullPath: false,
  showRibbon: true,
  showFileTabs: true,
  hideExtensionInFileTab: false,
}

export class AppearanceSettingTab extends SettingTab {

  get name() {
    return this.i18n.t.settingTabs.appearance.name
  }

  constructor(
    config = useService('config-repository'),
    private settings = useService('settings'),
    private i18n = useService('i18n'),
  ) {
    super()

    settings.setDefault(DEFAULT_SETTINGS)
    config.on('switch', () => {
      this.containerEl.innerHTML = ''
      this.onload()
    })
  }

  onload() {
    const { settings } = this
    const t = this.i18n.t.settingTabs.appearance

    this.addSettingTitle(t.fileExplorer)
    this.addSetting(setting => {
      setting.addName(t.showNotSupportedFile)
      setting.addDescription(t.showNotSupportedFileDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('showNotSupportedFile')
        checkbox.onclick = () => {
          settings.set('showNotSupportedFile', checkbox.checked)
        }
      })
    })

    this.addSettingTitle(t.search)
    this.addSetting(setting => {
      setting.addName(t.keepSearchResult)
      setting.addDescription(t.keepSearchResultDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('keepSearchResult')
        checkbox.onclick = () => {
          settings.set('keepSearchResult', checkbox.checked)
        }
      })
    })
    this.addSetting(setting => {
      setting.addName(t.searchResultFullPath)
      setting.addDescription(t.searchResultFullPathDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('showSearchResultFullPath')
        checkbox.onclick = () => {
          settings.set('showSearchResultFullPath', checkbox.checked)
        }
      })
    })

    this.addSettingTitle(t.advanced)
    this.addSetting(setting => {
      setting.addName(t.ribbon)
      setting.addDescription(t.ribbonDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('showRibbon')
        checkbox.onclick = () => {
          settings.set('showRibbon', checkbox.checked)
        }
      })
    })
    this.addSetting(setting => {
      setting.addName(t.fileTabs)
      setting.addDescription(t.fileTabsDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('showFileTabs')
        checkbox.onclick = () => {
          settings.set('showFileTabs', checkbox.checked)
        }
      })
    })
    this.addSetting(setting => {
      setting.addName(t.hideExtensionInFileTab)
      setting.addDescription(t.hideExtensionInFileTabDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('hideExtensionInFileTab')
        checkbox.onclick = () => {
          settings.set('hideExtensionInFileTab', checkbox.checked)
        }
      })
    })
  }

  onunload() {
    this.containerEl.remove()
  }
}
