import 'src/setup-test-env'
import { CommandCancelledError } from 'src/io/shell'


beforeEach(() => {
  ;(globalThis as any)._options = { userDataPath: '/ud' }
  ;(globalThis as any).File = { isMac: true }
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  delete (globalThis as any).bridge
  delete (globalThis as any)._options
  delete (globalThis as any).File
  delete (globalThis as any).fetch
})


describe('readRuntime()', () => {
  test('parses the runtime file written by the helper', async () => {
    ;(globalThis as any).bridge = {
      callSync: vi.fn(() => JSON.stringify({
        protocol: 1,
        version: '0.1.0',
        port: 53421,
        pid: 4242,
        token: 'abc',
      })),
    }

    const { readRuntime } = await import('src/io/helper/runtime')

    expect(readRuntime()).toMatchObject({ port: 53421, token: 'abc' })
  })

  test('ignores a missing, malformed or outdated runtime file', async () => {
    const { readRuntime } = await import('src/io/helper/runtime')

    ;(globalThis as any).bridge = { callSync: vi.fn(() => { throw new Error('ENOENT') }) }
    expect(readRuntime()).toBeNull()

    ;(globalThis as any).bridge = { callSync: vi.fn(() => 'not json') }
    expect(readRuntime()).toBeNull()

    ;(globalThis as any).bridge = {
      callSync: vi.fn(() => JSON.stringify({ protocol: 0, port: 1, pid: 1, token: 'x' })),
    }
    expect(readRuntime()).toBeNull()
  })
})


describe('detectHelperBinary()', () => {
  test('finds Homebrew paths without running a shell command', async () => {
    const callSync = vi.fn((method: string, filepath: string) => {
      if (method !== 'path.readTextLimited') throw new Error('unsupported')
      if (filepath === '/opt/homebrew/bin/typora-helper') return JSON.stringify({ binary: true })
      return JSON.stringify({ error: 'stat' })
    })
    ;(globalThis as any).bridge = { callSync }

    const { detectHelperBinary } = await import('src/io/helper/locator')

    expect(detectHelperBinary()).toBe('/opt/homebrew/bin/typora-helper')
    // Cached: a second call does not touch the bridge again.
    expect(detectHelperBinary()).toBe('/opt/homebrew/bin/typora-helper')
    expect(callSync).toHaveBeenCalledTimes(1)
  })

  test('returns null when the helper is not installed', async () => {
    ;(globalThis as any).bridge = {
      callSync: vi.fn(() => JSON.stringify({ error: 'stat' })),
    }

    const { detectHelperBinary } = await import('src/io/helper/locator')

    expect(detectHelperBinary()).toBeNull()
  })
})


describe('callHelper()', () => {
  const runtime = { protocol: 1, version: '0.1.0', port: 5000, pid: 1, token: 'secret' }

  test('returns the data of a successful op', async () => {
    ;(globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: { names: ['a'] } }),
    }))

    const { callHelper } = await import('src/io/helper/client')

    await expect(callHelper(runtime, 'list', { path: '/x' })).resolves.toEqual({ names: ['a'] })
  })

  test('maps an operation failure to HelperOpError', async () => {
    ;(globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      status: 200,
      json: async () => ({ ok: false, error: { code: 'io_error', message: 'EACCES' } }),
    }))

    const { callHelper } = await import('src/io/helper/client')

    await expect(callHelper(runtime, 'remove', { path: '/x' }))
      .rejects.toMatchObject({ name: 'HelperOpError', code: 'io_error' })
  })

  test('treats a rejected token as an unavailable helper', async () => {
    ;(globalThis as any).fetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, error: { code: 'unauthorized', message: 'invalid token' } }),
    }))

    const { callHelper } = await import('src/io/helper/client')

    await expect(callHelper(runtime, 'ping')).rejects.toMatchObject({ name: 'HelperUnavailableError' })
  })

  test('treats a transport failure as an unavailable helper', async () => {
    ;(globalThis as any).fetch = vi.fn(async () => { throw new Error('ECONNREFUSED') })

    const { callHelper } = await import('src/io/helper/client')

    await expect(callHelper(runtime, 'ping')).rejects.toMatchObject({ name: 'HelperUnavailableError' })
  })
})


describe('macHelper', () => {
  test('stops trying for the rest of the session when the dialog is cancelled', async () => {
    ;(globalThis as any).bridge = {
      callSync: vi.fn((method: string) => {
        if (method === 'path.readTextLimited') return JSON.stringify({ binary: true })
        throw new Error('ENOENT')
      }),
    }

    const { Shell } = await import('src/io/shell')
    const run = vi.spyOn(Shell, 'run').mockRejectedValue(new CommandCancelledError())

    const { macHelper } = await import('src/io/helper')

    await expect(macHelper.request('ping')).rejects.toMatchObject({ name: 'HelperUnavailableError' })
    expect(run).toHaveBeenCalledTimes(1)
    expect(macHelper.isEnabled()).toBe(false)

    // Later operations fall back without spawning again.
    await expect(macHelper.request('stat', { path: '/x' }))
      .rejects.toMatchObject({ name: 'HelperUnavailableError' })
    expect(run).toHaveBeenCalledTimes(1)
  })

  test('does not use the helper on other platforms', async () => {
    ;(globalThis as any).File = { isMac: false }

    const { macHelper } = await import('src/io/helper')

    expect(macHelper.isEnabled()).toBe(false)
    await expect(macHelper.request('ping')).rejects.toMatchObject({ name: 'HelperUnavailableError' })
  })
})
