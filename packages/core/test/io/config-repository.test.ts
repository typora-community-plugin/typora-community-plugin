import { vi } from 'vitest'
import 'src/setup-test-env'


const fsMock = {
  isDirectory: vi.fn(async () => false),
  mkdir: vi.fn(async () => { }),
  copy: vi.fn(async () => { }),
  remove: vi.fn(async () => { }),
  readText: vi.fn(async () => ''),
  writeText: vi.fn(async () => { }),
}

const logger = { debug() { }, info() { }, warn() { }, error() { } }

let ConfigRepository: typeof import('src/io/config-repository').ConfigRepository


beforeAll(async () => {
  await vi.doMock('src/io/fs/filesystem', () => ({ default: fsMock }))
  ;({ ConfigRepository } = await import('src/io/config-repository'))
})

beforeEach(() => {
  vi.clearAllMocks()
  fsMock.isDirectory.mockResolvedValue(false)
  fsMock.readText.mockResolvedValue('')
  fsMock.writeText.mockResolvedValue(undefined)
  fsMock.mkdir.mockResolvedValue(undefined)
  fsMock.copy.mockResolvedValue(undefined)
  fsMock.remove.mockResolvedValue(undefined)
})


function createRepo(vault: { path: string, configDir: string }) {
  return new ConfigRepository(logger as any, {
    ...vault,
    on: vi.fn(() => vi.fn()),
  } as any)
}


describe('ConfigRepository', () => {

  it('uses the global config without touching the file system when no vault is mounted', async () => {
    const repo = createRepo({ path: '', configDir: '.typora' })
    const onSwitch = vi.fn()

    repo.on('switch', onSwitch)
    // The event is deferred (like the `fs.access()` path) so that listeners
    // registered right after construction still receive it.
    expect(onSwitch).not.toHaveBeenCalled()

    await Promise.resolve()

    expect(onSwitch).toHaveBeenCalledTimes(1)
    expect(repo.isUsingGlobalConfig).toBe(true)
    expect(fsMock.isDirectory).not.toHaveBeenCalled()
  })

  it('does not switch to a vault-local config when no vault is mounted', () => {
    const repo = createRepo({ path: '', configDir: '.typora' })

    ;(repo as any).useVaultConfig()

    expect(repo.isUsingGlobalConfig).toBe(true)
    expect(fsMock.isDirectory).not.toHaveBeenCalled()
  })

  it('uses the vault config when its directory exists', async () => {
    fsMock.isDirectory.mockResolvedValue(true)
    const repo = createRepo({ path: '/vault', configDir: '/vault/.typora' })

    await Promise.resolve()

    expect(fsMock.isDirectory).toHaveBeenCalledWith('/vault/.typora')
    expect(repo.isUsingGlobalConfig).toBe(false)
    expect(repo.configDir).toBe('/vault/.typora')
  })

  it('does not write config content that is already on disk', async () => {
    fsMock.isDirectory.mockResolvedValue(true)
    fsMock.readText.mockResolvedValue('{\n  "a": 1\n}\n')
    const repo = createRepo({ path: '', configDir: '.typora' })
    await Promise.resolve()

    await expect(repo.writeConfigJson('core', { a: 1 })).resolves.toBe(true)

    expect(fsMock.writeText).not.toHaveBeenCalled()
  })

  it('writes changed config content', async () => {
    fsMock.isDirectory.mockResolvedValue(true)
    fsMock.readText.mockResolvedValue('{\n  "a": 1\n}\n')
    const repo = createRepo({ path: '', configDir: '.typora' })
    await Promise.resolve()

    await expect(repo.writeConfigJson('core', { a: 2 })).resolves.toBe(true)

    expect(fsMock.writeText).toHaveBeenCalledWith(
      expect.stringContaining('core.json'),
      '{\n  "a": 2\n}',
    )
  })

  it('creates the config directory only when it does not exist', async () => {
    fsMock.isDirectory.mockResolvedValue(false)
    const repo = createRepo({ path: '', configDir: '.typora' })
    await Promise.resolve()

    await repo.writeConfigJson('core', { a: 1 })

    expect(fsMock.mkdir).toHaveBeenCalledTimes(1)
    expect(fsMock.writeText).toHaveBeenCalledTimes(1)
  })

  it('does not write defaults when the directory cannot be prepared', async () => {
    fsMock.isDirectory.mockResolvedValue(false)
    fsMock.mkdir.mockRejectedValue(new Error('Command cancelled.'))
    const repo = createRepo({ path: '', configDir: '.typora' })
    await Promise.resolve()

    await expect(repo.writeConfigJson('core', { a: 1 })).resolves.toBe(false)

    expect(fsMock.writeText).not.toHaveBeenCalled()
  })
})
