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
      setting.addCheckbox({ settings, bindingKey: 'showNotSupportedFile' })
    })

    this.addSettingTitle(t.search)
    this.addSetting(setting => {
      setting.addName(t.keepSearchResult)
      setting.addDescription(t.keepSearchResultDesc)
      setting.addCheckbox({ settings, bindingKey: 'keepSearchResult' })
    })
    this.addSetting(setting => {
      setting.addName(t.searchResultFullPath)
      setting.addDescription(t.searchResultFullPathDesc)
      setting.addCheckbox({ settings, bindingKey: 'showSearchResultFullPath' })
    })
    this.addSetting(setting => {
      setting.addName(t.advancedSearchMode)
      setting.addDescription(t.advancedSearchModeDesc)
      setting.addCheckbox({ settings, bindingKey: 'advancedSearchMode' })
    })

    this.addSettingTitle(t.advanced)
    this.addSetting(setting => {
      setting.addName(t.ribbon)
      setting.addDescription(t.ribbonDesc)
      setting.addCheckbox({ settings, bindingKey: 'showRibbon' })
    })
  }
}
