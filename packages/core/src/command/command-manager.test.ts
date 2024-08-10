import 'src/setup-test-env'
import { jest } from '@jest/globals'
import { useService } from 'src/common/service'
import { CommandManager, Command } from './command-manager'


describe('CommandManager', () => {
  let commandManager: CommandManager
  let mockHotkeyManager = useService('hotkey-manager')

  beforeEach(() => {
    commandManager = new CommandManager()
  })

  test('registers a command', () => {
    const command: Command = {
      id: 'test-command',
      title: 'Test Command',
      callback: jest.fn(),
      hotkey: 'ctrl+shift+t',
      scope: 'global',
    }

    const unregister = commandManager.register(command)

    expect(commandManager.commandMap['test-command']).toBeDefined()
    expect(mockHotkeyManager.addHotkey).toHaveBeenCalledWith('Ctrl+Shift+T', command.callback)

    unregister()
    expect(commandManager.commandMap['test-command']).toBeUndefined()
    expect(mockHotkeyManager.addHotkey).toHaveBeenCalledTimes(1)
  })

  test('runs a command', () => {
    const command: Command = {
      id: 'run-command',
      title: 'Test Command',
      callback: jest.fn(),
      scope: 'global',
    }

    commandManager.register(command)

    commandManager.run('run-command')

    expect(command.callback).toHaveBeenCalled()
  })
})
