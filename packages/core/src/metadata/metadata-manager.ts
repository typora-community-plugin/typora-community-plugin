import path from 'src/path'
import { editor } from 'typora'
import decorate from '@plylrnsdy/decorate.js'
import { StickyEvents } from 'src/common/events'
import { useService } from 'src/common/service'
import { DeferredQueue } from 'src/utils/schedule/deferred-queue'
import { Semaphore } from 'src/utils/schedule/semaphore'
import type { DisposeFunc } from 'src/utils/types'
import { MetadataIndexer } from 'src/metadata/processing/indexer'
import { MetadataProcessor } from 'src/metadata/processing/processor'
import { MetadataProviderRegistry, normalizeExtension, type MetadataProvider, type RegisterOptions } from 'src/metadata/provider/registry'
import { closeCache, deleteCacheEntries, type Cache, type CacheEntry } from 'src/metadata/store/store'
import { syncFileEvents } from 'src/metadata/sync/file-sync'
import { interceptQuickOpenWorker } from 'src/metadata/sync/worker-sync'

export type { MetadataProvider, RegisterOptions } from 'src/metadata/provider/registry'


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
  private processor = new MetadataProcessor(this.providerRegistry)
  cache: Cache = {}

  private concurrencyLimit: number
  private _activeVaultId: string

  /**
   * Queue for incremental work issued while indexing. The work is deferred so
   * it is applied to the published cache instead of being clobbered when
   * `index()` publishes its result.
   */
  private _indexingWork = new DeferredQueue()

  /**
   * Limits concurrent incremental updates. A whole-vault event (e.g. the
   * Quick Open worker reporting every file at once, or a provider being
   * registered) would otherwise spawn one `processFile` per file and exhaust
   * the OS file-descriptor limit (`EMFILE`).
   */
  private _updateLimiter: Semaphore

  private indexer: MetadataIndexer

  /**
   * @param options.concurrency Number of files processed simultaneously, default 10
   */
  constructor(
    options: { concurrency?: number } = {},
    private vault = useService('vault'),
    config = useService('config-repository'),
  ) {
    super('metadata')
    this.concurrencyLimit = options.concurrency ?? 10
    this._updateLimiter = new Semaphore(this.concurrencyLimit)
    this._activeVaultId = this.vault.id

    this.indexer = new MetadataIndexer({
      vault,
      processor: this.processor,
      concurrency: this.concurrencyLimit,
      indexingWork: this._indexingWork,
      events: {
        start: total => this.emit('index:start', total),
        progress: current => this.emit('index:progress', current),
        done: () => this.emit('index:done'),
      },
      publish: cache => { this.cache = cache },
    })

    this.setSticky('index:done')

    // Keep the cache in sync with changes of the file system.
    syncFileEvents(this)

    // Rebind the cache/connection when the workspace (vault) is switched.
    config.on('switch', () => this._onConfigSwitch())

    // Keep the cache in sync with the native Quick Open worker.
    interceptQuickOpenWorker(this)

    // The worker is created lazily along with the panel, so re-attach on use.
    decorate.afterCall(editor.quickOpenPanel, 'initFileCache', () =>
      interceptQuickOpenWorker(this))
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
    if (this._indexingWork.defer(() => this._invalidateExtension(ext, hadProviders))) return

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
    await this.indexer.index()
  }

  /**
   * Get metadata for a file by relative path.
   */
  get(relativePath: string): CacheEntry | undefined {
    return this.cache[relativePath]
  }

  /**
   * Re-index a single file (absolute path) and keep the cache up to date.
   *
   * @param content Unsaved editor content. When provided the file's on-disk
   * state is ignored and metadata is derived from this content instead.
   */
  async update(filePath: string, content?: string): Promise<void> {
    await this._indexingWork.run(() =>
      this._updateLimiter.run(async () => {
        await this.processor.processFile(this.cache, this.vault.path, filePath, content)

        const relativePath = this.toRelative(filePath)
        if (relativePath in this.cache) {
          this.emit('index:update', relativePath)
        }
      })
    )
  }

  /**
   * Remove a file or a folder subtree (absolute path) from the cache.
   */
  remove(filePath: string): void {
    if (this._indexingWork.defer(() => this.remove(filePath))) return

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
    if (this._indexingWork.defer(() => this.rename(oldPath, newPath))) return

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
