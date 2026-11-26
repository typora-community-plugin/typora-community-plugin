import 'src/setup-test-env'
import { MacFS } from 'src/io/fs/fs.darwin'
import { CommandCancelledError, Shell } from 'src/io/shell'


let fs: MacFS
let callHandler: ReturnType<typeof vi.fn>
let callSync: ReturnType<typeof vi.fn>
let shellRun: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  fs = new MacFS()

  callHandler = vi.fn((_channel: string, _payload: any, callback: (value: any) => void) => {
    callback(false)
  })
  callSync = vi.fn(() => {
    throw new Error('path.readTextLimited is unavailable')
  })

  ;(globalThis as any).bridge = { callHandler, callSync }
  ;(globalThis as any).JSBridge = { invoke: vi.fn(async () => true) }
  shellRun = vi.spyOn(Shell, 'run').mockResolvedValue('')
})

afterEach(() => {
  vi.restoreAllMocks()
  delete (globalThis as any).bridge
  delete (globalThis as any).JSBridge
})


describe('MacFS', () => {

  test('detects an existing directory without running a shell command', async () => {
    callHandler.mockImplementation((_channel: string, _payload: any, callback: (value: any) => void) => {
      callback(true)
    })

    await expect(fs.exists('/plugins')).resolves.toBe(true)

    expect(callHandler).toHaveBeenCalledWith('path.isDirectory', '/plugins', expect.any(Function))
    expect(shellRun).not.toHaveBeenCalled()
  })

  test('detects an existing file through path.readTextLimited', async () => {
    callSync.mockReturnValue('{"content":""}')

    await expect(fs.exists('/settings/core.json')).resolves.toBe(true)

    expect(callSync).toHaveBeenCalledWith('path.readTextLimited', '/settings/core.json')
    expect(shellRun).not.toHaveBeenCalled()
  })

  test('reports a missing file without running a shell command', async () => {
    callSync.mockReturnValue('{"error":"stat"}')

    await expect(fs.exists('/missing.json')).resolves.toBe(false)

    expect(shellRun).not.toHaveBeenCalled()
  })

  test('falls back to test -e on Typora versions without path.readTextLimited', async () => {
    shellRun.mockResolvedValue('')

    await expect(fs.exists('/legacy.json')).resolves.toBe(true)

    expect(shellRun).toHaveBeenCalledWith(`test -e ${Shell.escape('/legacy.json')}`)
  })

  test('rethrows cancellation instead of treating it as a missing file', async () => {
    shellRun.mockRejectedValue(new CommandCancelledError())

    await expect(fs.exists('/cancelled.json')).rejects.toMatchObject({
      cancelled: true,
    })
  })

  test('turns a synchronous read error into a rejected promise', async () => {
    callSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })

    await expect(fs.readText('/missing.json')).rejects.toThrow('ENOENT')
  })

  test('lists an empty directory as an empty array', async () => {
    shellRun.mockResolvedValue('  \n')

    await expect(fs.list('/empty')).resolves.toEqual([])
  })

  test('writes text with printf and escapes paths', async () => {
    await fs.writeText("/tmp/it's.json", "it's")

    expect(shellRun).toHaveBeenCalledWith(
      `printf '%s\\n' ${Shell.escape("it's")} > ${Shell.escape("/tmp/it's.json")}`,
    )
  })

  test('appends text with printf instead of cat', async () => {
    await fs.appendText('/tmp/app.log', 'hello\n')

    expect(shellRun).toHaveBeenCalledWith(
      `printf '%s' ${Shell.escape('hello\n')} >> ${Shell.escape('/tmp/app.log')}`,
    )
  })

  test('removes a file through path.delete', async () => {
    await fs.remove('/tmp/file.txt')

    expect((globalThis as any).JSBridge.invoke).toHaveBeenCalledWith('path.delete', '/tmp/file.txt')
    expect(shellRun).not.toHaveBeenCalled()
  })

  test('removes a directory through rm -r', async () => {
    callHandler.mockImplementation((_channel: string, _payload: any, callback: (value: any) => void) => {
      callback(true)
    })

    await fs.remove('/tmp/folder')

    expect(shellRun).toHaveBeenCalledWith(`rm -r ${Shell.escape('/tmp/folder')}`)
  })

  test('copies a file through path.copyFile', async () => {
    await fs.copy('/tmp/a.json', '/tmp/b.json')

    expect((globalThis as any).JSBridge.invoke).toHaveBeenCalledWith('path.copyFile', {
      from: '/tmp/a.json',
      to: '/tmp/b.json',
    })
    expect(shellRun).not.toHaveBeenCalled()
  })

  test('copies a directory through cp -r', async () => {
    callHandler.mockImplementation((_channel: string, _payload: any, callback: (value: any) => void) => {
      callback(true)
    })

    await fs.copy('/tmp/a', '/tmp/b')

    expect(shellRun).toHaveBeenCalledWith(
      `cp -r ${Shell.escape('/tmp/a')} ${Shell.escape('/tmp/b')}`,
    )
  })

  test('moves a file through path.moveFile', async () => {
    await fs.move('/tmp/a.json', '/tmp/b.json')

    expect((globalThis as any).JSBridge.invoke).toHaveBeenCalledWith('path.moveFile', {
      from: '/tmp/a.json',
      to: '/tmp/b.json',
    })
    expect(shellRun).not.toHaveBeenCalled()
  })
})
