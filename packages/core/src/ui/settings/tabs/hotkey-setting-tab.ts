import { useService } from "src/common/service"
import { SettingTab } from "../setting-tab"
import type { Command } from "src/command/command-manager"
import { useEventBus } from "src/common/eventbus"
import { html } from "src/utils"
import { eventToHotkey, readableHotkey } from "src/hotkey-manager"
import type { SettingItem } from "../setting-item"


export class HotkeySettingTab extends SettingTab {

  get name() {
    return this.i18n.t.settingTabs.hotkey.name
  }

  constructor(
    config = useService('config-repository'),
    private app = useEventBus('app'),
    private i18n = useService('i18n'),
    private commands = useService('command-manager'),
  ) {
    super()

    config.on('switch', () => {
      this.containerEl.innerHTML = ''
      this.onload()
    })
  }

  onload() {
    this.register(
      this.app.on('load', () => {
        this.containerEl.innerHTML = ''
        Object.values(this.commands.commandMap)
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
      this.commands.setCommandHotkey(id, null)
      this.addCreateHotkeyButton(setting, id)
    })
  }

  private addCreateHotkeyButton(setting: SettingItem, id: string) {
    setting.addButton(btn => {
      btn.append(html`<span class="fa fa-plus"></span>`)
      btn.onclick = () => {
        btn.remove()
        setting.addButton(el => {
          el.innerText = this.i18n.t.settingTabs.hotkey.waitHotkey
          el.classList.add('primary')
          el.onkeyup = event => {
            el.onkeyup = null
            event.stopPropagation()
            setting.controls.innerHTML = ''
            const hotkey = readableHotkey(eventToHotkey(event))
            this.addHotkey(setting, id, hotkey)
            this.commands.setCommandHotkey(id, hotkey)
          }
          setTimeout(() => el.focus())
        })
      }
    })
  }
}
