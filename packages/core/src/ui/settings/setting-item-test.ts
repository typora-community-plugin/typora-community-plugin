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
        ({ items, item, panelEl }) => {
          const labelItem = new SettingItem()
          labelItem.addName("Label")
          labelItem.addDescription(`Selected item: ${item}`)
          labelItem.addText(input => { input.placeholder = `text for ${item}` })
          panelEl.append(labelItem.containerEl)

          const valueItem = new SettingItem()
          valueItem.addName("Value")
          valueItem.addInput('password', input => { input.placeholder = "value..." })
          panelEl.append(valueItem.containerEl)

          const button = new SettingItem()
          if (item !== '+') {
            button.addButton(button => {
              button.textContent = "remove"
              button.onclick = () => layout.removeItem(item)
            })
          }
          else {
            button.addButton(button => {
              button.textContent = "add"
              button.onclick = () => layout.setItems([...items.slice(0, -1), `item-${++nextIndex}`, '+'])
            })
          }
          panelEl.append(button.containerEl)
        },
      )
    })
  }
}
