import { jest } from '@jest/globals'
import 'src/setup-test-env'


const fsMock = {
  listFiles: jest.fn(),
  stat: jest.fn(),
  readText: jest.fn(),
}

async function setup() {
  jest.clearAllMocks()
  await jest.unstable_mockModule('src/io/fs/filesystem', () => ({ default: fsMock }))

  const { MetadataProcessor } = await import('./processor')
  const { MetadataProviderRegistry } = await import('src/metadata/provider/registry')

  return { MetadataProcessor, MetadataProviderRegistry }
}

const entry = (mtime = 1) => ({ mtime, metadata: { frontmatter: {}, tags: [] } })


describe('MetadataProcessor', () => {

  describe('processFile()', () => {

    it('is a no-op when no provider is registered for the extension', async () => {
      const { MetadataProcessor, MetadataProviderRegistry } = await setup()
      const processor = new MetadataProcessor(new MetadataProviderRegistry())
      const cache: Record<string, any> = {}

      await processor.processFile(cache, '/vault', '/vault/a.md')

      expect(cache).toEqual({})
      expect(fsMock.stat).not.toHaveBeenCalled()
    })

    it('computes metadata and stores it under the vault-relative path', async () => {
      const { MetadataProcessor, MetadataProviderRegistry } = await setup()
      const registry = new MetadataProviderRegistry()
      registry.register('md', async (ctx) => ({
        mtime: ctx.fileStats().mtimeMs,
        metadata: { title: 'x' },
      }))
      const processor = new MetadataProcessor(registry)
      fsMock.stat.mockResolvedValue({ mtimeMs: 100, size: 10 })
      const cache: Record<string, any> = {}

      await processor.processFile(cache, '/vault', '/vault/a.md')

      expect(cache['a.md']).toMatchObject({ mtime: 100, metadata: { title: 'x' } })
    })

    it('skips reprocessing when mtime and provider signature are unchanged', async () => {
      const { MetadataProcessor, MetadataProviderRegistry } = await setup()
      const registry = new MetadataProviderRegistry()
      const provider = jest.fn(async (ctx: any) => ({
        mtime: ctx.fileStats().mtimeMs,
        metadata: {},
      }))
      registry.register('md', provider)
      const processor = new MetadataProcessor(registry)
      fsMock.stat.mockResolvedValue({ mtimeMs: 100, size: 10 })
      const cache: Record<string, any> = {}

      await processor.processFile(cache, '/vault', '/vault/a.md')
      await processor.processFile(cache, '/vault', '/vault/a.md')

      expect(provider).toHaveBeenCalledTimes(1)
    })
  })

  describe('pruneCache()', () => {

    it('drops entries without a provider or outside the file list', async () => {
      const { MetadataProcessor, MetadataProviderRegistry } = await setup()
      const registry = new MetadataProviderRegistry()
      registry.register('md', async () => ({ metadata: {} }))
      const processor = new MetadataProcessor(registry)
      const cache = {
        'a.md': entry(),
        'gone.md': entry(),
        'img.png': entry(),
      }

      processor.pruneCache(cache, '/vault', ['/vault/a.md', '/vault/img.png'])

      expect(Object.keys(cache)).toEqual(['a.md'])
    })
  })
})
