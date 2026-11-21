import { jest } from '@jest/globals'
import 'src/setup-test-env'


const fsMock = {
  access: jest.fn(async () => { }),
  mkdir: jest.fn(async () => { }),
  copy: jest.fn(async () => { }),
  remove: jest.fn(async () => { }),
}

const logger = { debug() { }, info() { }, warn() { }, error() { } }

let ConfigRepository: typeof import('../../src/io/config-repository').ConfigRepository


beforeAll(async () => {
  await jest.unstable_mockModule('src/io/fs/filesystem', () => ({ default: fsMock }))
  ;({ ConfigRepository } = await import('../../src/io/config-repository'))
})

beforeEach(() => jest.clearAllMocks())


function createRepo(vault: { path: string, configDir: string }) {
  return new ConfigRepository(logger as any, {
    ...vault,
    on: jest.fn(() => jest.fn()),
  } as any)
}


describe('ConfigRepository', () => {

  it('uses the global config without touching the file system when no vault is mounted', async () => {
    const repo = createRepo({ path: '', configDir: '.typora' })
    const onSwitch = jest.fn()

    repo.on('switch', onSwitch)
    // The event is deferred (like the `fs.access()` path) so that listeners
    // registered right after construction still receive it.
    expect(onSwitch).not.toHaveBeenCalled()

    await Promise.resolve()

    expect(onSwitch).toHaveBeenCalledTimes(1)
    expect(repo.isUsingGlobalConfig).toBe(true)
    expect(fsMock.access).not.toHaveBeenCalled()
  })

  it('does not switch to a vault-local config when no vault is mounted', () => {
    const repo = createRepo({ path: '', configDir: '.typora' })

    ;(repo as any).useVaultConfig()

    expect(repo.isUsingGlobalConfig).toBe(true)
    expect(fsMock.access).not.toHaveBeenCalled()
  })
})
