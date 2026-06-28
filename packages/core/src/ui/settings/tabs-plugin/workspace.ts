import { useService } from "src/common/service"
import { SettingTab } from "../setting-tab"


export type WorkspaceSettings = {
  useWorkspace: boolean
  hideExtensionInFileTab: boolean
  useBlankNewTab: boolean
  useAutoSwap: boolean
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  useWorkspace: true,
  hideExtensionInFileTab: false,
  useBlankNewTab: false,
  useAutoSwap: true,
}

export class WorkspaceSettingTab extends SettingTab {

  get name() {
    return this.i18n.t.internalPlugins.workspace.name
  }

  constructor(
    private settings = useService('settings'),
    private i18n = useService('i18n'),
  ) {
    super()
  }

  onshow() {
    this.containerEl.innerHTML = ''
    this.render()
  }

  render() {
    const t = this.i18n.t.internalPlugins.workspace.settings
    const settings = this.settings

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

    this.addSetting(setting => {
      setting.addName(t.useBlankNewTab)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('useBlankNewTab')
        checkbox.onclick = () => {
          settings.set('useBlankNewTab', checkbox.checked)
        }
      })
    })

    this.addSetting(setting => {
      setting.addName(t.useAutoSwap)
      setting.addDescription(t.useAutoSwapDesc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = settings.get('useAutoSwap')
        checkbox.onclick = () => {
          settings.set('useAutoSwap', checkbox.checked)
        }
      })
    })
  }
}
