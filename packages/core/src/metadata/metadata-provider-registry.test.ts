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

  describe('getSignature', () => {
    it('returns an empty string when no provider is registered', () => {
      const registry = createRegistry()

      expect(registry.getSignature('md')).toBe('')
    })

    it('changes when a provider is added', () => {
      const registry = createRegistry()
      registry.register('md', provider)
      const before = registry.getSignature('md')

      const other: MetadataProvider = async () => ({})
      registry.register('md', other)

      expect(registry.getSignature('md')).not.toBe(before)
    })

    it('changes when a provider is replaced by another with the same count', () => {
      const registry = createRegistry()
      registry.register('md', provider)
      const before = registry.getSignature('md')

      registry.unregister('md', provider)
      const replacement: MetadataProvider = async () => ({ replaced: true })
      registry.register('md', replacement)

      expect(registry.getSignature('md')).not.toBe(before)
    })

    it('is stable across identical provider sets', () => {
      const a = createRegistry()
      const b = createRegistry()
      const shared: MetadataProvider = async (ctx) => ({ text: await ctx.text() })

      a.register('md', shared)
      b.register('md', shared)

      expect(a.getSignature('md')).toBe(b.getSignature('md'))
    })
  })
})
