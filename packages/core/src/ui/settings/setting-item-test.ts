import { noop } from "src/utils"
import { SettingTab } from "./setting-tab"


export class SettingItemTestTab extends SettingTab {
  get name() {
    return "Test: Setting Item" as const
  }

  constructor() {
    super()

    this.addSetting(setting => {
      setting.addName("Text Area")
      setting.addTextArea(noop)
    })
  }
}
