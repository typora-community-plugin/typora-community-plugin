import { noop } from "src/utils"
import { SettingItem } from "./setting-item"
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

    this.addSidebarLayoutExample()
  }

  private addSidebarLayoutExample() {
    let nextIndex = 3

    this.addSetting(setting => {
      setting.addName("Sidebar Layout")
      setting.addDescription("A sidebar + panel layout. Click a sidebar item to switch the panel content.")

      const layout = setting.addSidebarLayout(
        { items: ['item-one', 'item-two', 'item-three', '+'], initialActive: 'item-one' },
        ({ items, item, panel }) => {
          panel.addSetting(labelItem => {
            labelItem.addName("Label")
            labelItem.addDescription(`Selected item: ${item}`)
            labelItem.addText(input => { input.placeholder = `text for ${item}` })
          })

          panel.addSetting(valueItem => {
            valueItem.addName("Value")
            valueItem.addInput('password', input => { input.placeholder = "value..." })
          })

          panel.addSetting(button => {
            if (item !== '+') {
              button.addButton(btn => {
                btn.textContent = "remove"
                btn.onclick = () => layout.removeItem(item)
              })
            }
            else {
              button.addButton(btn => {
                btn.textContent = "add"
                btn.onclick = () => layout.setItems([...items.slice(0, -1), `item-${++nextIndex}`, '+'])
              })
            }
          })
        },
      )
    })
  }
}
