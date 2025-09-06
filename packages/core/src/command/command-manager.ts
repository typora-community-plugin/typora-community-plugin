import { useEventBus } from "src/common/eventbus"
import { useService } from "src/common/service"
import { type HotkeyScope, readableHotkey } from "src/hotkey-manager"
import { debounced } from "src/utils"
import type { DisposeFunc } from "src/utils/types"


export type Command = {
  id: string
  title: string
  scope: HotkeyScope
  hotkey?: string | null
  /**
   * @default true
   */
  showInCommandPanel?: boolean
  /**
   * MUST support not passing any parameters.
   */
  callback: (...args: any[]) => void
}

type InternalCommands = {
  'command:open'(): void
  'config:global'(): void
  'config:vault'(): void
  'core.workspace:reset'(): void
  'core.workspace:split-right'(path?: string): void
  'core.workspace:split-down'(path?: string): void
  'settings:open'(): void
}

type COMMAND_NAMES = keyof InternalCommands


export class CommandManager {

  protected defaultCommandMap: Record<string, Command> = {}

  commandMap: Record<string, Command> = {}

  protected disposableMap: Record<string, DisposeFunc[]> = {}

  constructor(
    app = useEventBus('app'),
    private logger = useService('logger', ['CommandManager']),
    private config = useService('config-repository'),
    private hotkeyManager = useService('hotkey-manager'),
  ) {
    // after plugin loaded (command registered), load command hotkeys
    app.on('load', () => this.loadConfig())
  }

  register(command: Command) {
    if (command.id in this.defaultCommandMap) {
      this.logger.error(`command ${command.id} already registered`)
    }

    if (command.showInCommandPanel == null) {
      command.showInCommandPanel = true
    }

    this.defaultCommandMap[command.id] = command
    this.commandMap[command.id] = Object.create(command)
    this.disposableMap[command.id] = []

    if (command.hotkey) {
      command.hotkey = readableHotkey(command.hotkey)
      this.bindHotkey(command)
    }

    return () => this.unregister(command)
  }

  unregister(command: Command) {
    this.unbindHotkey(this.commandMap[command.id])
    delete this.commandMap[command.id]
    delete this.defaultCommandMap[command.id]
  }

  protected bindHotkey(command: Command) {
    if (!command.hotkey) {
      this.unbindHotkey(command)
      return
    }

    const disposes = this.disposableMap[command.id] = [] as DisposeFunc[]

    disposes.push(
      command.scope === 'global'
        ? this.hotkeyManager.addHotkey(command.hotkey, command.callback)
        : this.hotkeyManager.addEditorHotkey(command.hotkey, command.callback))
  }

  protected unbindHotkey(command: Command) {
    this.disposableMap[command.id].forEach(fn => fn())
    this.disposableMap[command.id] = []
  }

  run<K extends COMMAND_NAMES>(commandId: K, args: Parameters<InternalCommands[K]>): void
  run(commandId: string, args?: any[]): void
  run(commandId: string, args: any[] = []) {
    try {
      this.commandMap[commandId]?.callback(...args)
    }
    catch (error) {
      this.logger.error(`run:${commandId}`, error)
    }
  }

  setCommandHotkey(commandId: string, hotkey: string | null) {
    const cmd = this.commandMap[commandId]

    if (this.defaultCommandMap[commandId].hotkey == hotkey) {
      delete cmd.hotkey
    }
    else {
      cmd.hotkey = hotkey
    }

    this.bindHotkey(cmd)
    this.saveConfig()
  }

  resetCommandHotkey(commandId: string) {
    this.unbindHotkey(this.commandMap[commandId])
    this.setCommandHotkey(commandId, this.defaultCommandMap[commandId].hotkey!)
  }

  private loadConfig() {
    const map = this.config.readConfigJson('hotkeys') as Record<string, Command>

    Object.keys(this.commandMap)
      .forEach(id => this.resetCommandHotkey(id))

    Object.keys(map)
      .forEach(id => this.setCommandHotkey(id, map[id].hotkey!))
  }

  private getConfig() {
    return Object.keys(this.commandMap)
      .filter(id => Object.keys(this.commandMap[id]).length)
      .reduce((o, k) => (o[k] = this.commandMap[k], o), {} as Record<string, Command>)
  }

  @debounced(1e3)
  private saveConfig() {
    this.config.writeConfigJson('hotkeys', this.getConfig())
  }
}
