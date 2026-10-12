import 'src/setup-test-env'
import { MetadataProviderRegistry, type MetadataProvider } from './metadata-provider-registry'


describe('MetadataProviderRegistry', () => {

  function createRegistry(): MetadataProviderRegistry {
    return new MetadataProviderRegistry()
  }

  function providers(registry: MetadataProviderRegistry): Record<string, { provider: MetadataProvider }[]> {
    return (registry as any).providers
  }

  const provider: MetadataProvider = async () => ({})

  it('registers a provider under a normalized extension key', () => {
    const registry = createRegistry()
    registry.register('md', provider)

    expect(providers(registry)['.md']).toHaveLength(1)
  })

  it('normalizes the extension on both register and unregister', () => {
    const registry = createRegistry()
    registry.register('.MD', provider)
    registry.unregister('md', provider)

    expect(providers(registry)['.md']).toBeUndefined()
  })

  it('returns a dispose function that unregisters the provider', () => {
    const registry = createRegistry()
    const dispose = registry.register('md', provider)
    dispose()

    expect(providers(registry)['.md']).toBeUndefined()
  })

  it('keeps other providers when unregistering one', () => {
    const registry = createRegistry()
    const other: MetadataProvider = async () => ({})
    registry.register('md', provider)
    registry.register('md', other)
    registry.unregister('md', provider)

    expect(providers(registry)['.md']).toEqual([{ provider: other, merge: undefined }])
  })

  it('ignores unregistering an unknown provider or extension', () => {
    const registry = createRegistry()
    registry.register('md', provider)

    expect(() => registry.unregister('md', async () => ({}))).not.toThrow()
    expect(() => registry.unregister('png', provider)).not.toThrow()
    expect(providers(registry)['.md']).toHaveLength(1)
  })

  it('gets providers by extension, normalizing the key', () => {
    const registry = createRegistry()
    registry.register('md', provider)

    expect(registry.get('md')).toHaveLength(1)
    expect(registry.get('.md')).toHaveLength(1)
    expect(registry.get('png')).toBeUndefined()
  })
})
