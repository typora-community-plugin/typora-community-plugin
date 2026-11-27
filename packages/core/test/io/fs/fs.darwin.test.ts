import 'src/setup-test-env'
import { MacFS } from 'src/io/fs/fs.darwin'
import { macHelper } from 'src/io/helper'
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

  test('detects a file through bridge handlers without running a shell command', async () => {
    callSync.mockReturnValue('{"content":""}')

    await expect(fs.isFile('/vault/doc.md')).resolves.toBe(true)

    expect(shellRun).not.toHaveBeenCalled()
  })

  test('reports a directory as not a file without running a shell command', async () => {
    callHandler.mockImplementation((_channel: string, _payload: any, callback: (value: any) => void) => {
      callback(true)
    })

    await expect(fs.isFile('/vault/sub')).resolves.toBe(false)

    expect(shellRun).not.toHaveBeenCalled()
  })

  test('reports a missing path as not a file without running a shell command', async () => {
    callSync.mockReturnValue('{"error":"stat"}')

    await expect(fs.isFile('/vault/missing.md')).resolves.toBe(false)

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

  test('parses the BSD stat fields into mtime and size', async () => {
    shellRun.mockResolvedValue('1795698131 334 Regular File\n')

    const stats = await fs.stat('/vault/doc.md')

    expect(shellRun).toHaveBeenCalledWith(
      `LC_ALL=C stat -f '%m %z %HT' ${Shell.escape('/vault/doc.md')}`,
    )
    expect(stats.mtimeMs).toBe(1795698131000)
    expect(stats.size).toBe(334)
    expect(stats.isFile()).toBe(true)
    expect(stats.isDirectory()).toBe(false)
  })

  test('recognises a directory from the BSD stat output', async () => {
    shellRun.mockResolvedValue('1795698131 96 Directory\n')

    const stats = await fs.stat('/vault/sub')

    expect(stats.isDirectory()).toBe(true)
    expect(stats.isFile()).toBe(false)
  })

  test('lists an empty directory as an empty array', async () => {
    shellRun.mockResolvedValue('  \n')

    await expect(fs.list('/empty')).resolves.toEqual([])
  })

  test('unwraps the helper `{ names }` response for list and listDirs', async () => {
    const originalFile = (globalThis as any).File
    ;(globalThis as any).File = { isMac: true }
    const request = vi.spyOn(macHelper, 'request')
      .mockResolvedValueOnce({ names: ['.typora', 'doc.md'] })
      .mockResolvedValueOnce({ names: ['sub'] })

    try {
      await expect(fs.list('/vault')).resolves.toEqual(['.typora', 'doc.md'])
      await expect(fs.listDirs('/vault')).resolves.toEqual(['sub'])

      expect(shellRun).not.toHaveBeenCalled()
      expect(callHandler).not.toHaveBeenCalled()
      expect(request).toHaveBeenNthCalledWith(1, 'list', { path: '/vault' }, undefined)
      expect(request).toHaveBeenNthCalledWith(2, 'listDirs', { path: '/vault' }, undefined)
    }
    finally {
      request.mockRestore()
      ;(globalThis as any).File = originalFile
    }
  })

  test('lists directories through library.listDocsUnder without a shell command', async () => {
    callHandler.mockImplementation((channel: string, _payload: any, callback: (value: any) => void) => {
      if (channel === 'library.listDocsUnder') {
        callback({
          name: 'plugins',
          subdir: [
            { name: 'b', path: '/plugins/b' },
            { name: 'a', path: '/plugins/a' },
          ],
          content: [],
        })
        return
      }
      callback(false)
    })

    await expect(fs.listDirs('/plugins')).resolves.toEqual(['b', 'a'])

    expect(shellRun).not.toHaveBeenCalled()
  })

  test('falls back to ls when library.listDocsUnder is unavailable', async () => {
    callHandler.mockImplementation((channel: string, payload: any, callback: (value: any) => void) => {
      if (channel === 'library.listDocsUnder') {
        callback(null)
        return
      }
      callback(payload === '/plugins/a')
    })
    shellRun.mockResolvedValue('a\nb\n')

    await expect(fs.listDirs('/plugins')).resolves.toEqual(['a'])

    expect(shellRun).toHaveBeenCalledWith(`ls ${Shell.escape('/plugins')}`)
  })

  test('lists files recursively with mtimes through library.listDocsUnder', async () => {
    const tree: Record<string, any> = {
      '/vault': {
        name: 'vault',
        subdir: [{ name: 'sub', path: '/vault/sub' }],
        content: [{ name: 'a.md', path: '/vault/a.md', lastModified: new Date(1_700_000_000_000) }],
      },
      '/vault/sub': {
        name: 'sub',
        subdir: [],
        content: [{ name: 'b.md', path: '/vault/sub/b.md', lastModified: 1_700_000_001_000 }],
      },
    }
    callHandler.mockImplementation((channel: string, payload: any, callback: (value: any) => void) => {
      if (channel === 'library.listDocsUnder') {
        callback(tree[payload] ?? null)
        return
      }
      callback(false)
    })

    const files = await fs.listFilesWithStats('/vault', { recursive: true })

    expect(files).toEqual(expect.arrayContaining([
      { path: '/vault/a.md', mtimeMs: 1_700_000_000_000 },
      { path: '/vault/sub/b.md', mtimeMs: 1_700_000_001_000 },
    ]))
    expect(shellRun).not.toHaveBeenCalled()
  })

  test('returns undefined when the native file tree is unavailable', async () => {
    callHandler.mockImplementation((channel: string, _payload: any, callback: (value: any) => void) => {
      callback(channel === 'library.listDocsUnder' ? null : false)
    })

    await expect(fs.listFilesWithStats('/vault', { recursive: true })).resolves.toBeUndefined()
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
