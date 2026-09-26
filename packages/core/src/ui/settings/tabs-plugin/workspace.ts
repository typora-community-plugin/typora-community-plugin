import { useService } from "src/common/service"
import { SettingTab } from "../setting-tab"


export type WorkspaceSettings = {
  hideExtensionInFileTab: boolean
  useBlankNewTab: boolean
  useAutoSwap: boolean
  rightSplitWidth: number
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  hideExtensionInFileTab: false,
  useBlankNewTab: false,
  useAutoSwap: true,
  rightSplitWidth: 280,
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
      setting.addCheckbox({ settings, bindingKey: 'hideExtensionInFileTab' })
    })

    this.addSetting(setting => {
      setting.addName(t.useBlankNewTab)
      setting.addCheckbox({ settings, bindingKey: 'useBlankNewTab' })
    })

    this.addSetting(setting => {
      setting.addName(t.useAutoSwap)
      setting.addDescription(t.useAutoSwapDesc)
      setting.addCheckbox({ settings, bindingKey: 'useAutoSwap' })
    })
  }
}
