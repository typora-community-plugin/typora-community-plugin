import { useService } from "src/common/service"
import { SettingTab } from "../setting-tab"
import { debounce } from "src/utils"


export type FileLinkSettings = {
  openLinkInCurrentWin: boolean
  mdLinkWithoutExtension: boolean
  quickOpenInCurrentWin: boolean
  ignoreFile: boolean
  ignoreFileGlob: string
}

export const DEFAULT_FILE_LINK_SETTINGS: FileLinkSettings = {
  openLinkInCurrentWin: true,
  mdLinkWithoutExtension: false,
  quickOpenInCurrentWin: true,
  ignoreFile: true,
  ignoreFileGlob: '.git',
}

export class FileLinkSettingTab extends SettingTab {

  get name() {
    return this.i18n.t.settingTabs.fileLink.name
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
    const t = this.i18n.t.settingTabs.fileLink

    this.addSettingTitle(t.link)

    this.addSetting(setting => {
      setting.addName(t.openLinkInCurrentWin)
      setting.addDescription(t.openLinkInCurrentWinDesc)
      setting.addCheckbox({ settings, bindingKey: 'openLinkInCurrentWin' })
    })

    this.addSetting(setting => {
      setting.addName(t.mdLinkWithoutExtension)
      setting.addDescription(t.mdLinkWithoutExtensionDesc)
      setting.addCheckbox({ settings, bindingKey: 'mdLinkWithoutExtension' })
    })

    this.addSettingTitle(t.quickOpen)

    this.addSetting(setting => {
      setting.addName(t.quickOpenInCurrentWin)
      setting.addDescription(t.quickOpenInCurrentWinDesc)
      setting.addCheckbox({ settings, bindingKey: 'quickOpenInCurrentWin' })
    })

    this.addSetting(setting => {
      setting.addName(t.ignoreFileGlob)
      setting.addDescription(t.ignoreFileGlobDesc)
      setting.addCheckbox({ settings, bindingKey: 'ignoreFile' })
      setting.addText(input => {
        input.value = settings.get('ignoreFileGlob')
        input.onchange = debounce(() => {
          settings.set('ignoreFileGlob', input.value)
        }, 1e3)
      })
    })
  }
}
