import { useService } from "src/common/service"
import { SettingTab } from "../setting-tab"


export type AppearanceSettings = {
  showNotSupportedFile: boolean
  keepSearchResult: boolean
  showSearchResultFullPath: boolean
  advancedSearchMode: boolean
  showRibbon: boolean
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  showNotSupportedFile: false,
  keepSearchResult: false,
  showSearchResultFullPath: false,
  advancedSearchMode: false,
  showRibbon: true,
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

    this.render()
    config.on('switch', () => {
      this.containerEl.innerHTML = ''
      this.render()
    })
  }

  render() {
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
    this.addSetting(setting => {
      setting.addName(t.advancedSearchMode)
      setting.addDescription(t.advancedSearchModeDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('advancedSearchMode')
        checkbox.onclick = () => {
          settings.set('advancedSearchMode', checkbox.checked)
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
  }
}
