import { jest } from '@jest/globals'
import 'src/setup-test-env'
import type { MetadataManager, MetadataProvider } from './metadata-manager'


const fsMock = {
  listFiles: jest.fn(),
  stat: jest.fn(),
  readText: jest.fn(),
}

const storeMock = {
  loadCache: jest.fn(async () => ({})),
  saveCache: jest.fn(async () => { }),
  deleteCacheEntries: jest.fn(async () => { }),
  closeCache: jest.fn(),
}

async function loadManager(): Promise<typeof MetadataManager> {
  jest.clearAllMocks()
  storeMock.loadCache.mockResolvedValue({})

  await jest.unstable_mockModule('src/io/fs/filesystem', () => ({ default: fsMock }))
  await jest.unstable_mockModule('src/metadata/store/store', () => ({ ...storeMock }))

  return (await import('./metadata-manager')).MetadataManager
}

function createManager(
  Manager: typeof MetadataManager,
  opts: { concurrency?: number } = {},
) {
  const vault = { id: 'vault-1', path: '/vault', on: jest.fn(() => jest.fn()) }
  const config = { on: jest.fn(() => jest.fn()) }

  const manager = new Manager(
    { concurrency: opts.concurrency ?? 10 },
    vault as any,
    config as any,
  )

  return { manager, vault, config }
}

const entry = (mtime = 1) => ({ mtime, metadata: { frontmatter: {}, tags: [] } })
const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))


beforeEach(() => {
  ;(globalThis as any).editor = { quickOpenPanel: { initFileCache: () => { } } }
})


describe('MetadataManager', () => {

  describe('update()', () => {

    it('processes a file and populates the cache', async () => {
      const Manager = await loadManager()
      const { manager } = createManager(Manager)
      fsMock.stat.mockResolvedValue({ mtimeMs: 100, size: 10 })
      const provider = jest.fn<MetadataProvider>(async (ctx) => ({
        mtime: ctx.fileStats().mtimeMs,
        metadata: { title: 'x' },
      }))
      manager.register('md', provider)

      await manager.update('/vault/a.md')

      expect(provider).toHaveBeenCalledTimes(1)
      expect(manager.get('a.md')).toMatchObject({ mtime: 100, metadata: { title: 'x' } })
    })

    it('reuses the cache when mtime and provider signature are unchanged', async () => {
      const Manager = await loadManager()
      const { manager } = createManager(Manager)
      fsMock.stat.mockResolvedValue({ mtimeMs: 100, size: 10 })
      const provider = jest.fn<MetadataProvider>(async (ctx) => ({
        mtime: ctx.fileStats().mtimeMs,
        metadata: {},
      }))
      manager.register('md', provider)

      await manager.update('/vault/a.md')
      await manager.update('/vault/a.md')

      expect(provider).toHaveBeenCalledTimes(1)
    })

    it('reprocesses when the mtime changes', async () => {
      const Manager = await loadManager()
      const { manager } = createManager(Manager)
      fsMock.stat.mockResolvedValue({ mtimeMs: 100, size: 10 })
      const provider = jest.fn<MetadataProvider>(async (ctx) => ({
        mtime: ctx.fileStats().mtimeMs,
        metadata: {},
      }))
      manager.register('md', provider)

      await manager.update('/vault/a.md')
      fsMock.stat.mockResolvedValue({ mtimeMs: 200, size: 10 })
      await manager.update('/vault/a.md')

      expect(provider).toHaveBeenCalledTimes(2)
      expect(manager.get('a.md')).toMatchObject({ mtime: 200 })
    })

    it('limits concurrent processing to the configured concurrency', async () => {
      const Manager = await loadManager()
      const { manager } = createManager(Manager, { concurrency: 2 })
      fsMock.stat.mockResolvedValue({ mtimeMs: 1, size: 1 })

      let active = 0
      let max = 0
      const provider = jest.fn<MetadataProvider>(async () => {
        active++
        max = Math.max(max, active)
        await new Promise(resolve => setTimeout(resolve, 5))
        active--
        return { metadata: {} }
      })
      manager.register('md', provider)

      await Promise.all([1, 2, 3, 4, 5].map(i => manager.update(`/vault/f${i}.md`)))

      expect(provider).toHaveBeenCalledTimes(5)
      expect(max).toBeLessThanOrEqual(2)
    })
  })

  describe('register()', () => {

    it('invalidates cached metadata produced with a different provider set', async () => {
      const Manager = await loadManager()
      const { manager } = createManager(Manager)
      fsMock.stat.mockResolvedValue({ mtimeMs: 100, size: 10 })
      const provider = jest.fn<MetadataProvider>(async (ctx) => ({
        mtime: ctx.fileStats().mtimeMs,
        metadata: {},
      }))
      manager.register('md', provider)
      await manager.update('/vault/a.md')

      manager.register('md', jest.fn<MetadataProvider>(async () => ({ metadata: {} })))
      await flush()

      expect(storeMock.deleteCacheEntries).toHaveBeenCalledWith('vault-1', ['a.md'])
      expect(manager.get('a.md')).toBeDefined()
    })
  })

  describe('remove()', () => {

    it('drops a file and its subtree from the cache', async () => {
      const Manager = await loadManager()
      const { manager } = createManager(Manager)
      manager.cache = { 'a.md': entry(), 'dir/b.md': entry(), 'dir/sub/c.md': entry() }

      manager.remove('/vault/dir')

      expect(manager.get('a.md')).toBeDefined()
      expect(manager.get('dir/b.md')).toBeUndefined()
      expect(manager.get('dir/sub/c.md')).toBeUndefined()
      expect(storeMock.deleteCacheEntries).toHaveBeenCalledWith(
        'vault-1', ['dir/b.md', 'dir/sub/c.md'])
    })
  })

  describe('rename()', () => {

    it('moves a file and its subtree within the cache', async () => {
      const Manager = await loadManager()
      const { manager } = createManager(Manager)
      manager.cache = { 'a.md': entry(), 'dir/b.md': entry() }

      manager.rename('/vault/dir', '/vault/docs')

      expect(manager.get('dir/b.md')).toBeUndefined()
      expect(manager.get('docs/b.md')).toBeDefined()
      expect(manager.get('a.md')).toBeDefined()
    })
  })

  describe('index()', () => {

    it('processes vault files and publishes the cache', async () => {
      const Manager = await loadManager()
      const { manager } = createManager(Manager)
      fsMock.stat.mockResolvedValue({ mtimeMs: 5, size: 1 })
      fsMock.listFiles.mockResolvedValue(['/vault/a.md', '/vault/b.md'])
      const provider = jest.fn<MetadataProvider>(async () => ({ metadata: {} }))
      manager.register('md', provider)

      const done = jest.fn()
      const off = manager.on('index:done', done)
      await manager.index()
      off()

      expect(manager.get('a.md')).toBeDefined()
      expect(manager.get('b.md')).toBeDefined()
      expect(done).toHaveBeenCalled()
      expect(storeMock.saveCache).toHaveBeenCalledWith('vault-1', expect.any(Object))
    })

    it('throws when indexing is already in progress', async () => {
      const Manager = await loadManager()
      const { manager } = createManager(Manager)
      let resolveList!: (paths: string[]) => void
      fsMock.listFiles.mockReturnValue(new Promise(resolve => { resolveList = resolve }))

      const first = manager.index()
      await expect(manager.index()).rejects.toThrow('Indexing is already in progress.')

      resolveList([])
      await first
    })

    it('defers updates issued while indexing until the index finishes', async () => {
      const Manager = await loadManager()
      const { manager } = createManager(Manager)
      fsMock.stat.mockResolvedValue({ mtimeMs: 9, size: 1 })
      let resolveList!: (paths: string[]) => void
      fsMock.listFiles.mockReturnValue(new Promise(resolve => { resolveList = resolve }))
      const provider = jest.fn<MetadataProvider>(async () => ({ metadata: {} }))
      manager.register('md', provider)

      const indexing = manager.index()
      const updating = manager.update('/vault/extra.md')
      expect(manager.get('extra.md')).toBeUndefined()

      resolveList(['/vault/a.md'])
      await indexing
      await updating

      expect(manager.get('extra.md')).toBeDefined()
    })
  })
})
