import 'src/setup-test-env'
import { mergeMetadata, MetadataManager, type MergeSpec, type MetadataProvider } from './metadata-manager'


describe('mergeMetadata', () => {

  it('deep-merges plain objects by default', () => {
    const result = mergeMetadata([
      { data: { metadata: { frontmatter: { title: 'A' } } } },
      { data: { metadata: { titles: [{ name: 'H' }] } } },
    ])

    expect(result).toEqual({
      metadata: {
        frontmatter: { title: 'A' },
        titles: [{ name: 'H' }],
      },
    })
  })

  it('replaces arrays by default (no spec)', () => {
    const result = mergeMetadata([
      { data: { metadata: { tags: [{ name: 'a' }] } } },
      { data: { metadata: { tags: [{ name: 'b' }] } } },
    ])

    expect(result.metadata.tags).toEqual([{ name: 'b' }])
  })

  it('merges tags from frontmatter and inline providers into one array', () => {
    const markdown = {
      data: {
        metadata: {
          frontmatter: { title: 'Note' },
          tags: [{ name: 'front', lineText: 'tags: [front]', lineNumber: 2 }],
          titles: [{ name: 'Note', lineText: '# Note', lineNumber: 5 }],
        },
      },
    }
    const tagProvider = {
      data: { metadata: { tags: [{ name: 'inline', lineText: '# inline', lineNumber: 9 }] } },
      spec: { 'metadata.tags': 'concatUnique' } as MergeSpec,
    }

    const result = mergeMetadata([markdown, tagProvider])

    expect(result.metadata.tags).toEqual([
      { name: 'front', lineText: 'tags: [front]', lineNumber: 2 },
      { name: 'inline', lineText: '# inline', lineNumber: 9 },
    ])
    expect(result.metadata.frontmatter).toEqual({ title: 'Note' })
    expect(result.metadata.titles).toHaveLength(1)
  })

  it('dedupes concatUnique by exact tag name, keeping the first occurrence', () => {
    const result = mergeMetadata([
      { data: { metadata: { tags: [{ name: 'dup', lineNumber: 1 }] } } },
      {
        data: { metadata: { tags: [{ name: 'dup', lineNumber: 2 }, { name: 'Dup', lineNumber: 3 }] } },
        spec: { 'metadata.tags': 'concatUnique' },
      },
    ])

    expect(result.metadata.tags).toEqual([
      { name: 'dup', lineNumber: 1 },
      { name: 'Dup', lineNumber: 3 },
    ])
  })

  it('dedupes concatUnique primitives by deep equality', () => {
    const result = mergeMetadata([
      { data: { metadata: { tags: ['a', 'b'] } } },
      { data: { metadata: { tags: ['b', 'c'] } }, spec: { 'metadata.tags': 'concatUnique' } },
    ])

    expect(result.metadata.tags).toEqual(['a', 'b', 'c'])
  })

  it('concatenates arrays with the concat strategy', () => {
    const result = mergeMetadata([
      { data: { metadata: { tags: ['a'] } } },
      { data: { metadata: { tags: ['a', 'b'] } }, spec: { 'metadata.tags': 'concat' } },
    ])

    expect(result.metadata.tags).toEqual(['a', 'a', 'b'])
  })

  it('honors the "*" fallback strategy', () => {
    const result = mergeMetadata([
      { data: { metadata: { tags: ['a'] } } },
      { data: { metadata: { tags: ['b'] } }, spec: { '*': 'concat' } },
    ])

    expect(result.metadata.tags).toEqual(['a', 'b'])
  })

  it('replaces an object with the replace strategy', () => {
    const result = mergeMetadata([
      { data: { metadata: { frontmatter: { title: 'A', author: 'X' } } } },
      {
        data: { metadata: { frontmatter: { title: 'B' } } },
        spec: { 'metadata.frontmatter': 'replace' },
      },
    ])

    expect(result.metadata.frontmatter).toEqual({ title: 'B' })
  })

  it('treats provider errors (empty result) as no-ops', () => {
    const result = mergeMetadata([
      { data: { metadata: { frontmatter: { title: 'A' } } } },
      { data: {} },
    ])

    expect(result).toEqual({ metadata: { frontmatter: { title: 'A' } } })
  })

  it('does not mutate the source objects', () => {
    const first = { metadata: { frontmatter: { title: 'A' } } }
    const second = { metadata: { tags: ['x'] } }
    mergeMetadata([{ data: first }, { data: second }])

    expect(first).toEqual({ metadata: { frontmatter: { title: 'A' } } })
    expect(second).toEqual({ metadata: { tags: ['x'] } })
  })
})


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
