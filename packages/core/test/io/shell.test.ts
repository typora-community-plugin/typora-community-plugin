import 'src/setup-test-env'
import { isCommandCancelled, Shell } from 'src/io/shell'

beforeEach(() => {
  // `Shell._queue` is shared by tests.
  (Shell as any)._queue = Promise.resolve()
})

afterEach(() => {
  delete (globalThis as any).bridge
  delete (globalThis as any).File
  delete (globalThis as any)._options
})


describe('Shell.run()', () => {

  test('runs the command through the Typora bridge', async () => {
    const callHandler = vi.fn((_channel: string, _payload: any, callback: (result: any[]) => void) => {
      callback([true, 'output', '', 'echo hi'])
    })
    ;(globalThis as any).bridge = { callHandler }

    await expect(Shell.run('echo hi', { cwd: '/tmp' })).resolves.toBe('output')

    expect(callHandler).toHaveBeenCalledWith(
      'controller.runCommand',
      { cwd: '/tmp', args: 'echo hi' },
      expect.any(Function),
    )
  })

  test('uses the mount folder as the default working directory', async () => {
    const callHandler = vi.fn((_channel: string, _payload: any, callback: (result: any[]) => void) => {
      callback([true, 'ok', '', 'pwd'])
    })
    ;(globalThis as any).bridge = { callHandler }
    ;(globalThis as any).File = { getMountFolder: () => '/mount' }

    await Shell.run('pwd')

    expect(callHandler).toHaveBeenCalledWith(
      'controller.runCommand',
      { cwd: '/mount', args: 'pwd' },
      expect.any(Function),
    )
  })

  test('rejects with the reported error', async () => {
    ;(globalThis as any).bridge = {
      callHandler: (_channel: string, _payload: any, callback: (result: any[]) => void) =>
        callback([false, '', 'command failed', 'boom']),
    }

    await expect(Shell.run('boom', { cwd: '/tmp' })).rejects.toThrow('command failed')
  })

  test('rejects with a distinguishable error when the user cancels', async () => {
    ;(globalThis as any).bridge = {
      callHandler: (_channel: string, _payload: any, callback: (result: any[]) => void) =>
        callback([false, '', 'Command cancelled.', 'test -e x']),
    }

    const error = await Shell.run('test -e x', { cwd: '/tmp' }).catch(error => error)

    expect(error).toMatchObject({
      name: 'CommandCancelledError',
      cancelled: true,
    })
    expect(isCommandCancelled(error)).toBe(true)
  })

  test('uses a valid working directory when no folder is mounted', async () => {
    ;(globalThis as any).File = { getMountFolder: () => '' }
    ;(globalThis as any)._options = { userDataPath: '/user-data' }
    const callHandler = vi.fn((_channel: string, _payload: any, callback: (result: any[]) => void) => {
      callback([true, 'ok', '', 'pwd'])
    })
    ;(globalThis as any).bridge = { callHandler }

    await Shell.run('pwd')

    expect(callHandler).toHaveBeenCalledWith(
      'controller.runCommand',
      { cwd: '/user-data', args: 'pwd' },
      expect.any(Function),
    )
  })

  test('runs one command at a time on macOS', async () => {
    ;(globalThis as any).File = { isMac: true, getMountFolder: () => '/mount' }
    const callbacks: Array<(result: any[]) => void> = []
    const callHandler = vi.fn((_channel: string, _payload: any, callback: (result: any[]) => void) => {
      callbacks.push(callback)
    })
    ;(globalThis as any).bridge = { callHandler }

    const first = Shell.run('first', { cwd: '/tmp' })
    const second = Shell.run('second', { cwd: '/tmp' })

    await Promise.resolve()
    expect(callHandler).toHaveBeenCalledTimes(1)

    callbacks[0]([true, 'first', '', 'first'])
    await expect(first).resolves.toBe('first')
    await Promise.resolve()

    expect(callHandler).toHaveBeenCalledTimes(2)

    callbacks[1]([true, 'second', '', 'second'])
    await expect(second).resolves.toBe('second')
  })
})


describe('Shell.escape()', () => {

  test('wraps the text in single quotes', () => {
    expect(Shell.escape('hello')).toBe("'hello'")
  })

  test('escapes embedded single quotes', () => {
    expect(Shell.escape("it's")).toBe("'it'\\''s'")
  })
})
