import fs from 'src/io/fs/filesystem'
import path from 'src/path'
import { editor } from 'typora'
import decorate from '@plylrnsdy/decorate.js'
import { StickyEvents } from 'src/common/events'
import { useService } from 'src/common/service'
import type { DisposeFunc } from 'src/utils/types'
import { mergeMetadata } from './metadata-merge'
import { closeCache, deleteCacheEntries, loadCache, saveCache, type Cache, type CacheEntry } from './metadata-store'
import { MetadataProviderContext, MetadataProviderRegistry, normalizeExtension, type MetadataProvider, type RegisterOptions } from './metadata-provider-registry'
import { interceptQuickOpenWorker } from './metadata-worker-sync'

export type { MetadataProvider, RegisterOptions } from './metadata-provider-registry'


export type MetadataEvents = {
  // initial
  'index:start'(total: number): void
  'index:progress'(current: number): void
  'index:done'(): void

  // update
  'index:update'(filePath: string): void
  'index:remove'(filePath: string): void
}

export class MetadataManager extends StickyEvents<MetadataEvents> {

  private providerRegistry = new MetadataProviderRegistry()
  cache: Cache = {}

  private concurrencyLimit: number
  private isIndexing: boolean = false
  private _quickOpenWorker: Worker | undefined
  private _pendingUpdates: Array<() => Promise<void>> = []
  private _drainingUpdates = false
  private _activeVaultId: string

  /**
   * @param options.concurrency Number of files processed simultaneously, default 10
   */
  constructor(
    options: { concurrency?: number } = {},
    markdownEditor = useService('markdown-editor'),
    workspace = useService('workspace'),
    private vault = useService('vault'),
    config = useService('config-repository'),
  ) {
    super('metadata')
    this.concurrencyLimit = options.concurrency ?? 10
    this._activeVaultId = this.vault.id

    this.setSticky('index:done')

    workspace.on('file:will-save', (file) => {
      const content = markdownEditor.getMarkdown()
      this.enqueueUpdate(() =>
        this.processFile(this.cache, this.vault.path, file, content)
          .then(() => {
            const relativePath = this.toRelative(file)
            this.emit('index:update', relativePath)
          })
      ).catch(() => { })
    })

    // Keep the cache in sync with changes of the file system.
    this.vault.on('file:delete', (filePath) => this.remove(filePath))
    this.vault.on('file:rename', (oldPath, newPath) => this.rename(oldPath, newPath))
    this.vault.on('directory:rename', (oldPath, newPath) => this.rename(oldPath, newPath))

    // Rebind the cache/connection when the workspace (vault) is switched.
    config.on('switch', () => this._onConfigSwitch())

    // Keep the cache in sync with the native Quick Open worker.
    this._interceptQuickOpenWorker()

    // The worker is created lazily along with the panel, so re-attach on use.
    decorate.afterCall(editor.quickOpenPanel, 'initFileCache', () =>
      this._interceptQuickOpenWorker())
  }

  /**
   * Convert an absolute path to a vault-relative path.
   */
  private toRelative(absPath: string): string {
    return path.relative(this.vault.path, absPath)
  }

  /**
   * Drop the previous vault's connection and in-memory cache so a fresh
   * connection is opened lazily for the new vault.
   */
  private _onConfigSwitch(): void {
    const vaultId = this.vault.id
    if (vaultId === this._activeVaultId) return

    closeCache(this._activeVaultId)
    this._activeVaultId = vaultId
    this.cache = {}
  }

  /**
   * Intercept the native Quick Open worker so that the files it adds or removes
   * (e.g. new files) are reflected in the metadata cache.
   */
  private _interceptQuickOpenWorker(): void {
    const worker = interceptQuickOpenWorker(
      {
        onFileAdded: filePath => { this.update(filePath).catch(() => { }) },
        onPathRemoved: prefix => this.remove(prefix),
      },
      w => w === this._quickOpenWorker,
    )

    if (worker) this._quickOpenWorker = worker
  }

  /**
   * Register a metadata provider for a file extension (without the leading `.`).
   *
   * @returns A dispose function that unregisters the provider.
   */
  register(ext: string, provider: MetadataProvider, opts?: RegisterOptions): DisposeFunc {
    const hadProviders = !!this.providerRegistry.get(ext)?.length
    const dispose = this.providerRegistry.register(ext, provider, opts)
    this._invalidateExtension(ext, hadProviders)
    return dispose
  }

  /**
   * Unregister a previously registered metadata provider.
   *
   * Cached metadata produced with the removed provider is dropped and, if other
   * providers remain for the extension, reprocessed.
   */
  unregister(ext: string, provider: MetadataProvider): void {
    const hadProviders = !!this.providerRegistry.get(ext)?.length
    this.providerRegistry.unregister(ext, provider)
    this._invalidateExtension(ext, hadProviders)
  }

  /**
   * Invalidate cached metadata that was produced with a different provider set.
   *
   * A provider registered/removed after `index()` (e.g. a community plugin that
   * loads later) would otherwise never run: `processFile` skips files whose
   * mtime is unchanged, so the cache keeps the stale result forever. Drop the
   * affected entries from the cache/IndexedDB and reprocess them.
   */
  private _invalidateExtension(ext: string, hadProviders: boolean): void {
    // While indexing, defer so the invalidation runs against the published cache.
    if (this.isIndexing) {
      this._pendingUpdates.push(async () => this._invalidateExtension(ext, hadProviders))
      return
    }

    const key = normalizeExtension(ext)
    const cachedPaths = Object.keys(this.cache)
      .filter(p => path.extname(p).toLowerCase() === key)

    if (cachedPaths.length === 0) {
      // Nothing cached to fix. If this is the extension's first provider and the
      // vault has already been indexed, run a full index to pick up its files.
      if (!hadProviders && Object.keys(this.cache).length > 0)
        this.index().catch(() => { })
      return
    }

    for (const relativePath of cachedPaths) delete this.cache[relativePath]

    deleteCacheEntries(this.vault.id, cachedPaths).catch((e: unknown) =>
      console.error('[Metadata] Failed to delete from IndexedDB:', e))

    for (const relativePath of cachedPaths)
      this.update(path.join(this.vault.path, relativePath)).catch(() => { })
  }

  /**
   * Index files in the vault
   */
  async index() {
    if (this.isIndexing) {
      throw new Error("Indexing is already in progress.")
    }

    this.isIndexing = true
    console.log('[Metadata] Start indexing...')

    const abortController = new AbortController()
    const dispose = this.vault.on('change', () => abortController.abort())

    try {
      const { signal } = abortController
      const vaultPath = this.vault.path
      const allFiles = await fs.listFiles(vaultPath, { recursive: true, signal })
      this.emit('index:start', allFiles.length)

      signal.throwIfAborted()
      const vaultId = this.vault.id
      const indexingCache = await loadCache(vaultId)

      signal.throwIfAborted()
      // `processQueue` drains its list via `pop()`, so hand it a copy to keep
      // `allFiles` intact for `pruneCache` below.
      await this.processQueue(indexingCache, vaultPath, [...allFiles], signal)

      signal.throwIfAborted()
      this.pruneCache(indexingCache, vaultPath, allFiles)

      this.cache = indexingCache
      this.emit('index:done')
      saveCache(vaultId, indexingCache)

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[Metadata] Indexing stopped, temporary cache discarded')
      } else {
        console.error('[Metadata] Indexing failed due to error:', error)
        throw error
      }
    } finally {
      dispose()
      this.isIndexing = false
      await this.drainPendingUpdates()
      console.log('[Metadata] Indexing completed.')
    }
  }

  /**
   * Drop cache entries that no longer correspond to an existing file with a
   * registered provider, so that deleted files do not resurrect from IndexedDB.
   */
  private pruneCache(cache: Cache, vaultPath: string, filePaths: string[]): void {
    const keep = new Set<string>()
    for (const filePath of filePaths) {
      const ext = path.extname(filePath).toLowerCase()
      if (this.providerRegistry.get(ext)?.length) {
        keep.add(path.relative(vaultPath, filePath))
      }
    }

    for (const key of Object.keys(cache)) {
      if (!keep.has(key)) delete cache[key]
    }
  }

  /**
   * Queue an incremental update while indexing so it is applied to the final
   * cache instead of being clobbered when `index()` publishes its result.
   */
  private enqueueUpdate(task: () => Promise<void>): Promise<void> {
    if (!this.isIndexing) return task()

    return new Promise<void>((resolve, reject) => {
      this._pendingUpdates.push(() => task().then(resolve, reject))
    })
  }

  /**
   * Defer a synchronous cache mutation while indexing, so it is applied to the
   * published cache. Returns `true` when the task was deferred.
   */
  private deferWhileIndexing(task: () => void): boolean {
    if (!this.isIndexing) return false

    this._pendingUpdates.push(async () => task())
    return true
  }

  private async drainPendingUpdates(): Promise<void> {
    if (this._drainingUpdates) return
    this._drainingUpdates = true
    try {
      while (this._pendingUpdates.length > 0) {
        const task = this._pendingUpdates.shift()!
        try {
          await task()
        } catch {
          // individual update failures are already logged by processFile
        }
      }
    } finally {
      this._drainingUpdates = false
    }
  }

  private async processQueue(indexingCache: Cache, vaultPath: string, filePaths: string[], signal: AbortSignal): Promise<void> {
    const allCount = filePaths.length
    const worker = async () => {
      while (filePaths.length > 0) {
        signal.throwIfAborted()
        const filePath = filePaths.pop()
        if (filePath) {
          await this.processFile(indexingCache, vaultPath, filePath, undefined, signal)
          this.emit('index:progress', allCount - filePaths.length - 1)
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
    const providers = this.providerRegistry.get(ext)

    if (!providers || providers.length === 0) return

    try {
      const stats = await fs.stat(filePath)
      const mtime = stats.mtimeMs
      const relativePath = path.relative(vaultPath, filePath)

      const cached = indexingCache[relativePath]
      // When content is provided (from file:will-save with editor content),
      // skip the mtime check — the file hasn't been written to disk yet so
      // mtime is still old. Without this, the provider never processes the
      // new content and the cache stays stale.
      //
      // The cache is also treated as stale when the provider set for the
      // extension changed, so metadata produced before a provider was added,
      // removed or replaced is re-processed instead of being reused by mtime.
      if (!content && cached && cached.mtime === mtime
        && cached.providerSignature === this.providerRegistry.getSignature(ext)) {
        indexingCache[relativePath] = cached
        return
      }

      const context = new MetadataProviderContext(filePath, content, stats)

      const results = await Promise.all(
        providers.map(async ({ provider }) => {
          signal?.throwIfAborted()
          try {
            return await provider(context)
          } catch (e) {
            console.warn(`Provider error in ${filePath}:`, e)
            return {}
          }
        })
      )

      signal?.throwIfAborted()

      const mergedMetadata = mergeMetadata(
        results.map((data, i) => ({ data, spec: providers[i].merge })),
      ) as CacheEntry

      mergedMetadata.providerSignature = this.providerRegistry.getSignature(ext)
      indexingCache[relativePath] = mergedMetadata
    } catch (error) {
      console.error(`Failed to process ${filePath}:`, error)
    }
  }

  /**
   * Get metadata for a file by relative path.
   */
  get(relativePath: string): CacheEntry | undefined {
    return this.cache[relativePath]
  }

  /**
   * Re-index a single file (absolute path) and keep the cache up to date.
   */
  async update(filePath: string): Promise<void> {
    await this.enqueueUpdate(async () => {
      await this.processFile(this.cache, this.vault.path, filePath)

      const relativePath = this.toRelative(filePath)
      if (relativePath in this.cache) {
        this.emit('index:update', relativePath)
      }
    })
  }

  /**
   * Remove a file or a folder subtree (absolute path) from the cache.
   */
  remove(filePath: string): void {
    if (this.deferWhileIndexing(() => this.remove(filePath))) return

    const relativePath = this.toRelative(filePath)
    if (!relativePath) return

    const prefix = relativePath + path.sep
    const removed: string[] = []
    for (const key of Object.keys(this.cache)) {
      if (key === relativePath || key.startsWith(prefix)) {
        delete this.cache[key]
        removed.push(key)
      }
    }

    if (removed.length > 0) {
      deleteCacheEntries(this.vault.id, removed).catch((e: unknown) =>
        console.error('[Metadata] Failed to delete from IndexedDB:', e))
      this.emit('index:remove', relativePath)
    }
  }

  /**
   * Move a file or a folder subtree (absolute paths) in the cache.
   */
  rename(oldPath: string, newPath: string): void {
    if (this.deferWhileIndexing(() => this.rename(oldPath, newPath))) return

    const oldRelative = this.toRelative(oldPath)
    const newRelative = this.toRelative(newPath)
    if (!oldRelative) return

    const prefix = oldRelative + path.sep
    for (const key of Object.keys(this.cache)) {
      if (key === oldRelative) {
        this.cache[newRelative] = this.cache[key]
        delete this.cache[key]
      } else if (key.startsWith(prefix)) {
        this.cache[newRelative + key.slice(oldRelative.length)] = this.cache[key]
        delete this.cache[key]
      }
    }

    this.emit('index:remove', oldRelative)
    this.emit('index:update', newRelative)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache = {}
    closeCache(this._activeVaultId)
  }
}
