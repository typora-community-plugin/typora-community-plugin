import fs from 'src/io/fs/filesystem'
import path from 'src/path'
import { Events } from 'src/common/events'
import { useService } from 'src/common/service'
import { MiniDexie } from 'src/utils/indexed-db'


class IndexAbortedError extends Error {
  constructor() {
    super('Indexing process was aborted.')
    this.name = 'IndexAbortedError'
  }
}

export type MetadataEvents = {
  'index'(): void
  'index:update'(): void
}

class MetadataProviderContext {
  constructor(
    readonly filePath: string,
    private textContent?: string
  ) { }

  text(): Promise<string> {
    return this.textContent
      ? Promise.resolve(this.textContent)
      : fs.readText(this.filePath).then(text => this.textContent = text)
  }
}

export type MetadataProvider = (ctx: MetadataProviderContext) => Promise<Record<string, any>>

interface Cache {
  [filePath: string]: CacheEntry
}

interface CacheEntry {
  mtime: number // Last modification timestamp
  metadata: Record<string, any>
  [prop: string]: any
}

const DB_SCHEMA = {
  files: 'path, metadata'
}

export class MetadataManager extends Events<MetadataEvents> {

  private providers: { [ext: string]: MetadataProvider[] } = {}
  cache: Cache = {}

  private concurrencyLimit: number
  private isIndexing: boolean = false

  /**
   * @param options.concurrency Number of files processed simultaneously, default 10
   */
  constructor(
    options: { concurrency?: number } = {},
    editor = useService('markdown-editor'),
    workspace = useService('workspace'),
    private vault = useService('vault'),
  ) {
    super('metadata')
    this.concurrencyLimit = options.concurrency ?? 10

    workspace.on('file:will-save', (file) => {
      this.processFile(this.cache, this.vault.path, file, editor.getMarkdown())
        .then(() => this.emit('index:update'))
        .catch(() => { })
    })
  }

  /**
   * Register a metadata provider for file extension
   */
  register(extension: string, provider: MetadataProvider): void {
    const ext = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`
    if (!this.providers[ext]) this.providers[ext] = []
    this.providers[ext].push(provider)
  }

  /**
   * Index files in the vault
   */
  async index() {
    if (this.isIndexing) {
      throw new Error("Indexing is already in progress.")
    }

    this.isIndexing = true

    try {
      const { abort, signal } = new AbortController()
      this.vault.on('change', () => abort())

      const vaultPath = this.vault.path
      const allFiles = await fs.listFiles(vaultPath, { recursive: true, signal })

      signal.throwIfAborted()
      const vaultId = this.vault.id
      const indexingCache = await this.loadFromIndexedDb(vaultId)

      signal.throwIfAborted()
      await this.processQueue(indexingCache, vaultPath, allFiles, signal)

      this.cache = indexingCache
      this.emit('index')
      this.saveToIndexedDb(vaultId, indexingCache)

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Indexing stopped, temporary cache discarded')
      } else {
        console.error('Indexing failed due to error:', error)
        throw error
      }
    } finally {
      this.isIndexing = false
    }
  }

  private async processQueue(indexingCache: Cache, vaultPath: string, filePaths: string[], signal: AbortSignal): Promise<void> {
    const worker = async () => {
      while (filePaths.length > 0) {
        signal.throwIfAborted()
        const filePath = filePaths.pop()
        if (filePath) {
          await this.processFile(indexingCache, vaultPath, filePath, null, signal)
        }
      }
    }

    const count = Math.min(this.concurrencyLimit, filePaths.length)
    const workers = Array.from({ length: count }, () => worker())

    await Promise.all(workers)
  }

  /**
   * Process a single file: with cache check and providers
   */
  private async processFile(indexingCache: Cache, vaultPath: string, filePath: string, content?: string, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted()

    const ext = path.extname(filePath).toLowerCase()
    const providers = this.providers[ext]

    if (!providers || providers.length === 0) return

    try {
      const stats = await fs.stat(filePath)
      const mtime = stats.mtimeMs
      const relativePath = path.relative(vaultPath, filePath)

      const cached = this.cache[relativePath]
      if (cached && cached.mtime === mtime) {
        indexingCache[relativePath] = cached
        return
      }

      const context = new MetadataProviderContext(filePath, content)

      const results = await Promise.all(
        providers.map(async (p) => {
          signal?.throwIfAborted()
          try {
            return await p(context)
          } catch (e) {
            console.warn(`Provider error in ${filePath}:`, e)
            return {}
          }
        })
      )

      signal?.throwIfAborted()

      const mergedMetadata = results.reduce((acc, curr) => ({ ...acc, ...curr }), {})
      indexingCache[relativePath] = {
        mtime,
        metadata: mergedMetadata
      }
    } catch (error) {
      if (error instanceof IndexAbortedError) throw error
      console.error(`Failed to process ${filePath}:`, error)
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache = {}
  }

  async loadFromIndexedDb(vaultId: string): Promise<Cache> {
    try {
      const db = new MiniDexie(`metadata:${vaultId}`)
        .version(1).stores(DB_SCHEMA)

      const records = await db.files.toArray()
      const loadedCache: Cache = {}
      for (const record of records) {
        const { path, metadata } = record
        loadedCache[path] = metadata as CacheEntry
      }

      console.log(`[Metadata] Loaded ${records.length} items from IndexedDB.`)
      return loadedCache
    } catch (e) {
      console.error('[Metadata] Failed to load IndexedDB:', e)
    }
  }

  async saveToIndexedDb(vaultId: string, cache: Cache): Promise<void> {
    try {
      const db = new MiniDexie(`metadata:${vaultId}`)
        .version(1).stores(DB_SCHEMA)

      const rows = Object.entries(cache).map(([filePath, metadata]) => ({
        path: filePath,
        metadata,
      }))

      await db.files.bulkPut(rows)
      console.log('[Metadata] Cache saved to IndexedDB.')
    } catch (e) {
      console.error('[Metadata] Failed to save IndexedDB:', e)
    }
  }
}
