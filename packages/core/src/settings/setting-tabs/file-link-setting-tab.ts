import type { App } from "src/app"
import { SettingTab } from "../setting-tab"


export type FileLinkSettings = {
  openLinkInCurrentWin: boolean
}

const DEFAULT_SETTINGS: FileLinkSettings = {
  openLinkInCurrentWin: true
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
        checkbox.addEventListener('click', event => {
          const el = event.target as HTMLInputElement
          settings.set('openLinkInCurrentWin', el.checked)
        })
      })
    })
  }

  onunload() {
    this.containerEl.remove()
  }
}
