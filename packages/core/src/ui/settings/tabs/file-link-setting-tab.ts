import { useService } from "src/common/service"
import { SettingTab } from "../setting-tab"
import { debounce } from "src/utils"


export type FileLinkSettings = {
  openLinkInCurrentWin: boolean
  quickOpenInCurrentWin: boolean
  ignoreFile: boolean
  ignoreFileGlob: string
}

export const DEFAULT_FILE_LINK_SETTINGS: FileLinkSettings = {
  openLinkInCurrentWin: true,
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

    this.addSetting(setting => {
      setting.addName(t.openLinkInCurrentWin)
      setting.addDescription(t.openLinkInCurrentWinDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('openLinkInCurrentWin')
        checkbox.onclick = () => {
          settings.set('openLinkInCurrentWin', checkbox.checked)
        }
      })
    })

    this.addSetting(setting => {
      setting.addName(t.quickOpenInCurrentWin)
      setting.addDescription(t.quickOpenInCurrentWinDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('quickOpenInCurrentWin')
        checkbox.onclick = () => {
          settings.set('quickOpenInCurrentWin', checkbox.checked)
        }
      })
    })

    this.addSetting(setting => {
      setting.addName(t.ignoreFileGlob)
      setting.addDescription(t.ignoreFileGlobDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('ignoreFile')
        checkbox.onclick = () => {
          settings.set('ignoreFile', checkbox.checked)
        }
      })
      setting.addText(input => {
        input.value = settings.get('ignoreFileGlob')
        input.onchange = debounce(() => {
          settings.set('ignoreFileGlob', input.value)
        }, 1e3)
      })
    })
  }
}
