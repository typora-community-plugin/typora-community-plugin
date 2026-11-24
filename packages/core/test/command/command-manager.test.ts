import 'src/setup-test-env'
import { type Command, CommandManager } from 'src/command/command-manager'
import { PublicEvents } from 'src/common/events'
import { useService } from 'src/common/service'
import { afterEach, vi } from 'vitest'


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
      callback: vi.fn(),
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

  test('`unregister()` is idempotent: repeated calls do not throw', () => {
    const command: Command = {
      id: 'double-unregister',
      title: 'Double Unregister',
      callback: vi.fn(),
      hotkey: 'ctrl+shift+d',
      scope: 'global',
    }

    const unregister = commandManager.register(command)

    unregister()
    expect(() => unregister()).not.toThrow()
    // direct unregister after the dispose function also safe
    expect(() => commandManager.unregister(command)).not.toThrow()

    expect(commandManager.commandMap['double-unregister']).toBeUndefined()
    expect(commandManager.getDisposableMap('double-unregister')).toBeUndefined()
  })

  test('runs a command', () => {
    const command: Command = {
      id: 'run-command',
      title: 'Test Command',
      callback: vi.fn(),
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
      callback: vi.fn(),
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
      callback: vi.fn(),
    }

    commandManager.testBindHotkey(command)
    const disposer = mockHotkeyManager.addHotkey('Ctrl+Shift+T', command.callback)

    commandManager.testUnbindHotkey(command)

    expect(disposer).toHaveBeenCalled()
    expect(commandManager.getDisposableMap('testCommand')).toHaveLength(0)
  })
})


describe('CommandManager configuration and recent commands', () => {
  const RECENT_KEY = 'typora-plugin-core@v2.recent-commands'
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  let scopeId = 0

  function createManager(options: {
    app?: any
    config?: any
    hotkey?: any
    logger?: any
  } = {}) {
    const app = options.app ?? new PublicEvents<any>(`test-app-${++scopeId}`)
    const config = options.config ?? { readConfigJson: vi.fn(), writeConfigJson: vi.fn() }
    const hotkey = options.hotkey ?? {
      addHotkey: vi.fn(() => vi.fn()),
      addEditorHotkey: vi.fn(() => vi.fn()),
    }

    return {
      app,
      config,
      hotkey,
      manager: new TestCommandManager(
        app,
        (options.logger ?? logger) as any,
        config as any,
        hotkey as any,
      ),
    }
  }

  function command(overrides: Partial<Command> = {}): Command {
    return {
      id: 'cmd',
      title: 'Command',
      scope: 'global',
      callback: vi.fn(),
      ...overrides,
    }
  }

  beforeEach(() => {
    localStorage.clear()
    logger.error.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('logs an error when the same id is registered twice', () => {
    const { manager } = createManager()
    const cmd = command({ id: 'dup' })

    manager.register(cmd)
    manager.register(command({ id: 'dup' }))

    expect(logger.error).toHaveBeenCalledWith('command dup already registered')
  })

  test('defaults showInCommandPanel to true and keeps an explicit false', () => {
    const { manager } = createManager()

    manager.register(command({ id: 'shown' }))
    manager.register(command({ id: 'hidden', showInCommandPanel: false }))

    expect(manager.commandMap.shown.showInCommandPanel).toBe(true)
    expect(manager.commandMap.hidden.showInCommandPanel).toBe(false)
  })

  test('binds editor-scoped hotkeys through the editor API', () => {
    const { manager, hotkey } = createManager()

    manager.register(command({ id: 'editor', scope: 'editor', hotkey: 'ctrl+e' }))

    expect(hotkey.addEditorHotkey).toHaveBeenCalledWith('Ctrl+E', expect.any(Function))
    expect(hotkey.addHotkey).not.toHaveBeenCalled()
  })

  test('bindHotkey unbinds when the command has no hotkey', () => {
    const { manager, hotkey } = createManager()
    manager.register(command({ id: 'with-key', hotkey: 'ctrl+s' }))

    const disposer = hotkey.addHotkey.mock.results[0].value
    manager.testBindHotkey(command({ id: 'with-key', hotkey: undefined }))

    expect(disposer).toHaveBeenCalled()
    expect(manager.getDisposableMap('with-key')).toEqual([])
  })

  test('run() ignores unknown commands and logs callback failures', () => {
    const { manager } = createManager()

    expect(() => manager.run('missing')).not.toThrow()

    manager.register(command({
      id: 'boom',
      callback: () => { throw new Error('exploded') },
    }))
    manager.run('boom')

    expect(logger.error).toHaveBeenCalledWith('run:boom', expect.any(Error))
  })

  test('keeps at most five unique recent commands and persists them', () => {
    const { manager } = createManager()

    manager.addToRecent('a')
    manager.addToRecent('b')
    manager.addToRecent('a')
    expect(manager.getRecentCommandIds()).toEqual(['a', 'b'])

    for (const id of ['c', 'd', 'e', 'f']) manager.addToRecent(id)

    expect(manager.getRecentCommandIds()).toEqual(['f', 'e', 'd', 'c', 'a'])
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toEqual(['f', 'e', 'd', 'c', 'a'])
  })

  test('loads recent commands from storage, filtering invalid entries', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['a', 1, 'b', null]))

    const { manager } = createManager()

    expect(manager.getRecentCommandIds()).toEqual(['a', 'b'])
  })

  test('falls back to an empty list for non-array or corrupt storage', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify({ a: 1 }))
    expect(createManager().manager.getRecentCommandIds()).toEqual([])

    localStorage.setItem(RECENT_KEY, '{not-json')
    logger.error.mockClear()
    expect(createManager().manager.getRecentCommandIds()).toEqual([])
    expect(logger.error).toHaveBeenCalledWith('loadRecentCommands', expect.any(Error))
  })

  test('logs when recent commands cannot be persisted', () => {
    const { manager } = createManager()
    const spy = vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => { throw new Error('quota') })

    manager.addToRecent('a')

    expect(logger.error).toHaveBeenCalledWith('saveRecentCommands', expect.any(Error))
    spy.mockRestore()
  })

  test('setCommandHotkey overrides the default and saves the config', () => {
    vi.useFakeTimers()
    const { manager, hotkey, config } = createManager()
    manager.register(command({ id: 'cfg', hotkey: 'ctrl+s' }))

    manager.setCommandHotkey('cfg', 'ctrl+k')

    expect(manager.commandMap.cfg.hotkey).toBe('ctrl+k')
    expect(hotkey.addHotkey).toHaveBeenLastCalledWith('ctrl+k', expect.any(Function))

    vi.advanceTimersByTime(1_000)
    expect(config.writeConfigJson).toHaveBeenCalledWith('hotkeys', expect.any(Object))
  })

  test('setCommandHotkey clears the binding when it equals the default', () => {
    const { manager, hotkey } = createManager()
    manager.register(command({ id: 'plain' }))

    // The default is undefined, so `null` is treated as "reset".
    manager.setCommandHotkey('plain', null)

    expect(hotkey.addHotkey).not.toHaveBeenCalled()
    expect(manager.getDisposableMap('plain')).toEqual([])
  })

  test('resetCommandHotkey unbinds the current hotkey', () => {
    const { manager, hotkey } = createManager()
    manager.register(command({ id: 'reset', hotkey: 'ctrl+s' }))
    const disposer = hotkey.addHotkey.mock.results[0].value

    manager.resetCommandHotkey('reset')

    expect(disposer).toHaveBeenCalled()
  })

  test('loadConfig applies stored hotkeys after resetting every command', () => {
    const { manager, app, hotkey, config } = createManager()
    manager.register(command({ id: 'first', hotkey: 'ctrl+s' }))
    manager.register(command({ id: 'second' }))
    config.readConfigJson.mockReturnValue({
      first: { hotkey: 'ctrl+k' },
      second: { hotkey: 'ctrl+j' },
    })

    app.emit('load')

    expect(hotkey.addHotkey).toHaveBeenCalledWith('ctrl+k', expect.any(Function))
    expect(hotkey.addHotkey).toHaveBeenCalledWith('ctrl+j', expect.any(Function))
    expect(manager.commandMap.first.hotkey).toBe('ctrl+k')
  })

  test('getConfig only includes commands with own properties', () => {
    vi.useFakeTimers()
    const { manager, config } = createManager()
    manager.register(command({ id: 'own', hotkey: 'ctrl+s' }))
    manager.register(command({ id: 'inherited' }))

    manager.setCommandHotkey('own', 'ctrl+k')
    vi.advanceTimersByTime(1_000)

    const [, saved] = config.writeConfigJson.mock.calls.at(-1)!
    expect(Object.keys(saved)).toEqual(['own'])
  })
})
