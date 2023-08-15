import type { App } from "src/app"
import { SettingTab } from "../setting-tab"


export type FileLinkSettings = {
  openLinkInCurrentWin: boolean
  ignoreFile: boolean
  ignoreFileGlob: string
}

const DEFAULT_SETTINGS: FileLinkSettings = {
  openLinkInCurrentWin: true,
  ignoreFile: true,
  ignoreFileGlob: '.git',
}

export class FileLinkSettingTab extends SettingTab {

  get name() {
    return this.app.i18n.t.settingTabs.fileLink.name
  }

  constructor(private app: App) {
    super()

    app.settings.setDefault(DEFAULT_SETTINGS)
  }

  onload() {
    const { settings } = this.app
    const t = this.app.i18n.t.settingTabs.fileLink

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
        input.onclick = () => {
          settings.set('ignoreFileGlob', input.value)
        }
      })
    })
  }

  onunload() {
    this.containerEl.remove()
  }
}
