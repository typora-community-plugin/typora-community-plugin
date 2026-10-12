import 'src/setup-test-env'
import { MetadataManager, type MetadataProvider } from './metadata-manager'


describe('MetadataManager register/unregister', () => {

  function createManager(): MetadataManager {
    const manager = Object.create(MetadataManager.prototype) as MetadataManager
    ;(manager as any).providers = {}
    return manager
  }

  function providers(manager: MetadataManager): Record<string, { provider: MetadataProvider }[]> {
    return (manager as any).providers
  }

  const provider: MetadataProvider = async () => ({})

  it('registers a provider under a normalized extension key', () => {
    const manager = createManager()
    manager.register('md', provider)

    expect(providers(manager)['.md']).toHaveLength(1)
  })

  it('normalizes the extension on both register and unregister', () => {
    const manager = createManager()
    manager.register('.MD', provider)
    manager.unregister('md', provider)

    expect(providers(manager)['.md']).toBeUndefined()
  })

  it('returns a dispose function that unregisters the provider', () => {
    const manager = createManager()
    const dispose = manager.register('md', provider)
    dispose()

    expect(providers(manager)['.md']).toBeUndefined()
  })

  it('keeps other providers when unregistering one', () => {
    const manager = createManager()
    const other: MetadataProvider = async () => ({})
    manager.register('md', provider)
    manager.register('md', other)
    manager.unregister('md', provider)

    expect(providers(manager)['.md']).toEqual([{ provider: other, merge: undefined }])
  })

  it('ignores unregistering an unknown provider or extension', () => {
    const manager = createManager()
    manager.register('md', provider)

    expect(() => manager.unregister('md', async () => ({}))).not.toThrow()
    expect(() => manager.unregister('png', provider)).not.toThrow()
    expect(providers(manager)['.md']).toHaveLength(1)
  })
})
