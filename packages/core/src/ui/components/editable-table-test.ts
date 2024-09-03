import { SettingTab } from "../settings/setting-tab"
import { Notice } from "./notice"


export class EditaleTableTestTab extends SettingTab {
  get name() {
    return "Test: Editale Table" as const
  }

  constructor() {
    super()

    const state = [
      { key: 'en', value: 'English' },
      { key: 'zh-cn', value: '中文' },
    ]

    this.addSetting(setting => {
      setting.addTable(table => {
        table
          .setHeaders([
            { title: 'Key', prop: 'key', type: 'text' },
            { title: 'Value', prop: 'value', type: 'text' },
          ])
          .setData(state)
          .onRowChange(row => {
            new Notice(`Edited: ${JSON.stringify(row)}`)
          })
          .onRowRemove(row => {
            new Notice(`Deleted: ${JSON.stringify(row)}`)
          })
      })
    })
  }
}
