import type { Command } from "src/command/command-manager"
import { useEventBus } from "src/common/eventbus"
import { useService } from "src/common/service"
import { eventToHotkey, readableHotkey } from "src/hotkey-manager"
import { debounce, html } from "src/utils"
import type { SettingItem } from "../setting-item"
import { SettingTab } from "../setting-tab"


const modifierKeys = new Set(['Alt', 'AltGraph', 'CapsLock', 'Control', 'Meta', 'Shift'])


export class HotkeySettingTab extends SettingTab {

  get name() {
    return this.i18n.t.settingTabs.hotkey.name
  }

  private query = ''
  private rendered = false

  constructor(
    config = useService('config-repository'),
    app = useEventBus('app'),
    private i18n = useService('i18n'),
    private commands = useService('command-manager'),
    private plugins = useService('plugin-manager'),
  ) {
    super()

    app.once('load', () => {
      this.render()
    })
    config.on('switch', () => {
      this.containerEl.innerHTML = ''
      this.render()
    })
  }

  render() {
    const t = this.i18n.t.settingTabs.hotkey

    this.addSetting(setting => {
      setting.addName(t.searchHotkey)
      setting.addText(input => {
        input.value = this.query
        input.oninput = debounce(() => {
          this.query = input.value
          this.renderHotkeyList()
        }, 300)
      })
    })

    this.renderHotkeyList()
    this.rendered = true
  }

  /**
   * Re-render when the page is shown, so commands of plugins enabled or
   * disabled since the last visit appear or disappear. Before the first
   * `render()` there is no search box yet, and the list would land above it.
   */
  onshow() {
    if (!this.rendered) return
    this.renderHotkeyList()
  }

  private renderHotkeyList() {
    const t = this.i18n.t.settingTabs.hotkey
    this.cleanHotkeyList()
    const query = this.query.toLowerCase()

    const shown = Object.values(this.commands.commandMap)
      .filter(cmd => cmd.showInCommandPanel && (!query || cmd.title.toLowerCase().includes(query)))

    // `Plugin.registerCommand()` prefixes a community plugin's command ids
    // with `${manifest.id}:`. Core plugins are not in `manifests`, so their
    // commands stay under core commands.
    const pluginPrefixes = Object.keys(this.plugins.manifests).map(id => `${id}:`)
    const isPluginCommand = (cmd: Command) => pluginPrefixes.some(prefix => cmd.id.startsWith(prefix))

    this.renderGroup(t.coreCommands, shown.filter(cmd => !isPluginCommand(cmd)))
    this.renderGroup(t.pluginCommands, shown.filter(isPluginCommand))
  }

  /** Render a titled group of commands, or nothing when it has none. */
  private renderGroup(title: string, commands: Command[]) {
    if (!commands.length) return

    this.addSetting(setting => {
      setting.addTitle(title)
      setting.containerEl.classList.add('typ-hotkey-group')
    })
    commands.forEach(cmd => this.renderHotkey(cmd))
  }

  private cleanHotkeyList() {
    this.containerEl.querySelectorAll('.typ-hotkey-group, .typ-hotkey-item')
      .forEach(el => el.remove())
  }

  private renderHotkey(cmd: Command) {
    this.addSetting(setting => {
      setting.addName(cmd.title)
      setting.containerEl.classList.add('typ-hotkey-item')

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
      // The button shows only an icon, so give it a name and a tooltip.
      const label = this.i18n.t.settingTabs.hotkey.addHotkey
      btn.setAttribute('aria-label', label)
      btn.title = label
      btn.append(html`<span class="fa fa-plus" aria-hidden="true"></span>`)
      btn.onclick = () => {
        btn.remove()
        setting.addButton(el => {
          el.innerText = this.i18n.t.settingTabs.hotkey.waitHotkey
          el.classList.add('primary')
          // Match core's policy: meta (⌘/Win) combinations are recorded on
          // `keydown` (macOS WebKit does not deliver their `keyup`), while
          // other combinations are recorded on `keyup` because an IME may
          // consume the `keydown` (e.g. Ctrl+. for punctuation switching).
          // Skip bare modifier presses so they do not end the recording.
          const finish = (event: KeyboardEvent) => {
            if (event.isComposing || modifierKeys.has(event.key)) return
            el.onkeydown = null
            el.onkeyup = null
            event.preventDefault()
            event.stopPropagation()
            setting.controls.innerHTML = ''
            const hotkey = readableHotkey(eventToHotkey(event))
            this.addHotkey(setting, id, hotkey)
            this.commands.setCommandHotkey(id, hotkey)
          }
          el.onkeydown = event => {
            if (!event.metaKey || event.repeat) return
            finish(event)
          }
          el.onkeyup = event => {
            if (event.metaKey) return
            finish(event)
          }
          setTimeout(() => el.focus())
        })
      }
    })
  }
}
