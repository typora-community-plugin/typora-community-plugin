import { vi } from 'vitest'
import 'src/setup-test-env'


const fsMock = {
  listFiles: vi.fn(),
  stat: vi.fn(),
  readText: vi.fn(),
}

const storeMock = {
  loadCache: vi.fn(async () => ({})),
  saveCache: vi.fn(async () => { }),
  deleteCacheEntries: vi.fn(async () => { }),
  closeCache: vi.fn(),
}

async function setup() {
  vi.clearAllMocks()
  storeMock.loadCache.mockResolvedValue({})

  await vi.doMock('src/io/fs/filesystem', () => ({ default: fsMock }))
  await vi.doMock('src/metadata/store/store', () => ({ ...storeMock }))

  const { MetadataIndexer } = await import('../../../src/metadata/processing/indexer')
  const { MetadataProcessor } = await import('../../../src/metadata/processing/processor')
  const { MetadataProviderRegistry } = await import('src/metadata/provider/registry')
  const { DeferredQueue } = await import('src/utils/schedule/deferred-queue')

  return { MetadataIndexer, MetadataProcessor, MetadataProviderRegistry, DeferredQueue }
}

function createVault() {
  return { id: 'v1', path: '/vault', on: vi.fn(() => vi.fn()) }
}


describe('MetadataIndexer', () => {

  it('indexes vault files, publishes the cache and emits lifecycle events', async () => {
    const { MetadataIndexer, MetadataProcessor, MetadataProviderRegistry, DeferredQueue } = await setup()
    const registry = new MetadataProviderRegistry()
    registry.register('md', async () => ({ metadata: {} }))
    const processor = new MetadataProcessor(registry)
    const events = { start: vi.fn(), progress: vi.fn(), done: vi.fn() }
    const publish = vi.fn()
    fsMock.listFiles.mockResolvedValue(['/vault/a.md', '/vault/b.md'])
    fsMock.stat.mockResolvedValue({ mtimeMs: 1, size: 1 })

    const indexer = new MetadataIndexer({
      vault: createVault() as any,
      processor,
      concurrency: 2,
      indexingWork: new DeferredQueue(),
      events,
      publish,
    })
    await indexer.index()

    expect(events.start).toHaveBeenCalledWith(2)
    expect(events.done).toHaveBeenCalled()
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ 'a.md': expect.any(Object), 'b.md': expect.any(Object) }))
    expect(storeMock.saveCache).toHaveBeenCalledWith('v1', expect.any(Object))
    expect(indexer.isIndexing).toBe(false)
  })

  it('skips indexing when no folder is mounted', async () => {
    const { MetadataIndexer, MetadataProcessor, MetadataProviderRegistry, DeferredQueue } = await setup()
    const events = { start: vi.fn(), progress: vi.fn(), done: vi.fn() }
    const publish = vi.fn()

    const indexer = new MetadataIndexer({
      vault: { id: 'v0', path: '', on: vi.fn(() => vi.fn()) } as any,
      processor: new MetadataProcessor(new MetadataProviderRegistry()),
      concurrency: 1,
      indexingWork: new DeferredQueue(),
      events,
      publish,
    })
    await indexer.index()

    expect(fsMock.listFiles).not.toHaveBeenCalled()
    expect(events.start).not.toHaveBeenCalled()
    expect(publish).not.toHaveBeenCalled()
    expect(indexer.isIndexing).toBe(false)
  })

  it('skips indexing when the vault path is relative', async () => {
    const { MetadataIndexer, MetadataProcessor, MetadataProviderRegistry, DeferredQueue } = await setup()

    const indexer = new MetadataIndexer({
      vault: { id: 'v0', path: '.', on: vi.fn(() => vi.fn()) } as any,
      processor: new MetadataProcessor(new MetadataProviderRegistry()),
      concurrency: 1,
      indexingWork: new DeferredQueue(),
      events: { start: vi.fn(), progress: vi.fn(), done: vi.fn() },
      publish: vi.fn(),
    })
    await indexer.index()

    expect(fsMock.listFiles).not.toHaveBeenCalled()
    expect(indexer.isIndexing).toBe(false)
  })

  it('throws when indexing is already in progress', async () => {
    const { MetadataIndexer, MetadataProcessor, MetadataProviderRegistry, DeferredQueue } = await setup()
    let resolveList!: (paths: string[]) => void
    fsMock.listFiles.mockReturnValue(new Promise(resolve => { resolveList = resolve }))

    const indexer = new MetadataIndexer({
      vault: createVault() as any,
      processor: new MetadataProcessor(new MetadataProviderRegistry()),
      concurrency: 1,
      indexingWork: new DeferredQueue(),
      events: { start: vi.fn(), progress: vi.fn(), done: vi.fn() },
      publish: vi.fn(),
    })

    const first = indexer.index()
    await expect(indexer.index()).rejects.toThrow('Indexing is already in progress.')

    resolveList([])
    await first
    expect(indexer.isIndexing).toBe(false)
  })

  it('stops the run when the vault changes', async () => {
    const { MetadataIndexer, MetadataProcessor, MetadataProviderRegistry, DeferredQueue } = await setup()
    let onVaultChange!: () => void
    const vault = {
      id: 'v1',
      path: '/vault',
      on: vi.fn((event: string, cb: () => void) => {
        if (event === 'change') onVaultChange = cb
        return vi.fn()
      }),
    }
    fsMock.listFiles.mockImplementation(async () => {
      onVaultChange()
      return []
    })
    const publish = vi.fn()
    const done = vi.fn()

    const indexer = new MetadataIndexer({
      vault: vault as any,
      processor: new MetadataProcessor(new MetadataProviderRegistry()),
      concurrency: 1,
      indexingWork: new DeferredQueue(),
      events: { start: vi.fn(), progress: vi.fn(), done },
      publish,
    })
    await indexer.index()

    expect(publish).not.toHaveBeenCalled()
    expect(done).not.toHaveBeenCalled()
    expect(indexer.isIndexing).toBe(false)
  })

  it('defers work issued while indexing until the run finishes', async () => {
    const { MetadataIndexer, MetadataProcessor, MetadataProviderRegistry, DeferredQueue } = await setup()
    let resolveList!: (paths: string[]) => void
    fsMock.listFiles.mockReturnValue(new Promise(resolve => { resolveList = resolve }))
    const indexingWork = new DeferredQueue()

    const indexer = new MetadataIndexer({
      vault: createVault() as any,
      processor: new MetadataProcessor(new MetadataProviderRegistry()),
      concurrency: 1,
      indexingWork,
      events: { start: vi.fn(), progress: vi.fn(), done: vi.fn() },
      publish: vi.fn(),
    })

    const indexing = indexer.index()
    const task = vi.fn()
    const queued = indexingWork.run(async () => { task() })
    expect(indexingWork.deferring).toBe(true)

    resolveList([])
    await indexing
    await queued

    expect(task).toHaveBeenCalledTimes(1)
    expect(indexingWork.deferring).toBe(false)
  })
})
