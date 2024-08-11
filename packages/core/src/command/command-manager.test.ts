import 'src/setup-test-env'
import { jest } from '@jest/globals'
import { useService } from 'src/common/service'
import { CommandManager, Command } from './command-manager'


class TestCommandManager extends CommandManager {
  getDefaultCommandMap(id: string) {
    return this.defaultCommandMap[id]
  }

  getDisposableMap(id: string) {
    return this.disposableMap[id]
  }

  testBindHotkey(command: Command) {
    this.bindHotkey(command)
  }

  testUnbindHotkey(command: Command) {
    this.unbindHotkey(command)
  }
}

describe('CommandManager', () => {
  let commandManager: TestCommandManager
  const mockHotkeyManager = useService('hotkey-manager')

  beforeEach(() => {
    commandManager = new TestCommandManager()
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

  test('`bindHotkey()` adds hotkey correctly', () => {
    const command: Command = {
      id: 'testCommand',
      title: 'Test Command',
      scope: 'global',
      hotkey: 'ctrl+s',
      callback: jest.fn(),
    }

    commandManager.testBindHotkey(command)

    const disposer = mockHotkeyManager.addHotkey('Ctrl+Shift+T', command.callback)
    expect(commandManager.getDisposableMap('testCommand')).toHaveLength(1)
    expect(commandManager.getDisposableMap('testCommand')[0]).toEqual(disposer)
  })

  test('`unbindHotkey()` removes hotkey correctly', () => {
    const command: Command = {
      id: 'testCommand',
      title: 'Test Command',
      scope: 'global',
      hotkey: 'ctrl+s',
      callback: jest.fn(),
    }

    commandManager.testBindHotkey(command)
    const disposer = mockHotkeyManager.addHotkey('Ctrl+Shift+T', command.callback)

    commandManager.testUnbindHotkey(command)

    expect(disposer).toHaveBeenCalled()
    expect(commandManager.getDisposableMap('testCommand')).toHaveLength(0)
  })
})
