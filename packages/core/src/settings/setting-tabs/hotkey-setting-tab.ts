import type { App } from "src/app"
import { SettingTab } from "../setting-tab"
import type { Command } from "src/command/command-manager"
import { html } from "src/utils/html"
import { eventToHotkey, readableHotkey } from "src/hotkey-manager"
import type { SettingItem } from "../setting-item"


export class HotkeySettingTab extends SettingTab {

  get name() {
    return this.app.i18n.t.settingTabs.hotkey.name
  }

  constructor(private app: App) {
    super()
  }

  onload() {
    this.register(
      this.app.on('load', () => {
        this.containerEl.innerHTML = ''
        Object.values(this.app.commands.commandMap)
          .forEach(cmd => this.renderHotkey(cmd))
      }))
  }

  private renderHotkey(cmd: Command) {
    this.addSetting(setting => {
      setting.addName(cmd.title)

      if (cmd.hotkey) {
        this.addHotkey(setting, cmd.id, cmd.hotkey)
      }
      else {
        this.addCreateHotkeyButton(setting, cmd.id)
      }
    })
  }

  private addHotkey(setting: SettingItem, id: string, hotkey: string) {
    hotkey = hotkey.split('+').join(' + ')

    setting.addRemovableTag(hotkey, () => {
      this.app.commands.setCommandHotkey(id, null)
      this.addCreateHotkeyButton(setting, id)
    })
  }

  private addCreateHotkeyButton(setting: SettingItem, id: string) {
    setting.addButton(btn => {
      btn.append(html`<span class="fa fa-plus"></span>`)
      btn.onclick = () => {
        btn.remove()
        setting.addButton(el => {
          el.innerText = this.app.i18n.t.settingTabs.hotkey.waitHotkey
          el.classList.add('primary')
          el.onkeyup = event => {
            el.onkeyup = null
            event.stopPropagation()
            setting.controls.innerHTML = ''
            const hotkey = readableHotkey(eventToHotkey(event))
            this.addHotkey(setting, id, hotkey)
            this.app.commands.setCommandHotkey(id, hotkey)
          }
          setTimeout(() => el.focus())
        })
      }
    })
  }
}
