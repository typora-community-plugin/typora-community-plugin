import 'src/setup-test-env'
import { Shell } from 'src/io/shell'

afterEach(() => {
  delete (globalThis as any).bridge
  delete (globalThis as any).File
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
})


describe('Shell.escape()', () => {

  test('wraps the text in single quotes', () => {
    expect(Shell.escape('hello')).toBe("'hello'")
  })

  test('escapes embedded single quotes', () => {
    expect(Shell.escape("it's")).toBe("'it'\\''s'")
  })
})
