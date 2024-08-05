import { useEventBus } from "src/common/eventbus"
import { registerService, useService } from "src/common/service"
import { type HotkeyScope, readableHotkey } from "src/hotkey-manager"
import { debounced } from "src/utils/decorator/debounced"
import { memorize } from "src/utils/function/memorize"
import type { DisposeFunc } from "src/utils/types"


const logger = useService('logger', ['CommandManager'])


export type Command = {
  id: string
  title: string
  scope: HotkeyScope
  hotkey?: string | null
  callback: () => void
}


registerService('command-manager', memorize(() => new CommandManager()))

export class CommandManager {

  private defaultCommandMap: Record<string, Command> = {}

  commandMap: Record<string, Command> = {}

  private disposableMap: Record<string, DisposeFunc[]> = {}

  constructor(
    app = useEventBus('app'),
    private vault = useService('config-storage'),
    private hotkeyManager = useService('hotkey-manager'),
  ) {
    app.on('load', () => {
      const map = vault.readConfigJson('hotkeys') as Record<string, Command>
      if (!map) return

      Object.keys(map).forEach(id => {
        this.setCommandHotkey(id, map[id].hotkey!)
      })
    })
  }

  register(command: Command) {
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
    this.disposableMap[command.id].forEach(fn => fn())
    delete this.disposableMap[command.id]
    delete this.commandMap[command.id]
    delete this.defaultCommandMap[command.id]
  }

  private bindHotkey(command: Command) {
    this.disposableMap[command.id].forEach(fn => fn())

    const disposes = this.disposableMap[command.id] = [] as DisposeFunc[]

    if (command.hotkey) {
      disposes.push(
        command.scope === 'global'
          ? this.hotkeyManager.addHotkey(command.hotkey, command.callback)
          : this.hotkeyManager.addEditorHotkey(command.hotkey, command.callback))
    }
  }

  run(commandId: string) {
    try {
      this.commandMap[commandId]?.callback()
    }
    catch (error) {
      logger.error(`run:${commandId}`, error)
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
    this.setCommandHotkey(commandId, this.defaultCommandMap[commandId].hotkey!)
  }

  private getConfig() {
    return Object.keys(this.commandMap)
      .filter(id => Object.keys(this.commandMap[id]).length)
      .reduce((o, k) => (o[k] = this.commandMap[k], o), {} as Record<string, Command>)
  }

  @debounced(1e3)
  private saveConfig() {
    this.vault.writeConfigJson('hotkeys', this.getConfig())
  }
}
