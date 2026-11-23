import fs from 'src/io/fs/filesystem'
import type { Vault } from 'src/io/vault'
import { type Cache, loadCache, saveCache } from 'src/metadata/store/store'
import path from 'src/path'
import { runConcurrent } from 'src/utils/schedule/concurrency'
import type { DeferredQueue } from 'src/utils/schedule/deferred-queue'
import type { MetadataProcessor } from './processor'


export interface MetadataIndexEvents {
  start(total: number): void
  progress(current: number): void
  done(): void
}


export interface MetadataIndexerDeps {
  vault: Vault
  processor: MetadataProcessor
  concurrency: number
  indexingWork: DeferredQueue
  events: MetadataIndexEvents
  /** Hand the freshly built cache to its owner. */
  publish(cache: Cache): void
}


/**
 * Orchestrates a full metadata index: list the vault, load the persisted
 * cache, process every file with a registered provider, prune stale entries and
 * persist the result. Incremental work issued meanwhile is deferred until the
 * run finishes.
 */
export class MetadataIndexer {

  private _isIndexing = false

  constructor(private deps: MetadataIndexerDeps) { }

  get isIndexing(): boolean {
    return this._isIndexing
  }

  async index(): Promise<void> {
    if (this._isIndexing) {
      throw new Error('Indexing is already in progress.')
    }

    const { vault, processor, concurrency, indexingWork, events, publish } = this.deps
    const vaultPath = vault.path

    // No folder is mounted and no document is opened. `vault.path` is empty in
    // that case, and scanning it would fall back to the process working
    // directory (or `/` on macOS), so skip indexing entirely.
    if (!vaultPath || !path.isAbsolute(vaultPath)) {
      console.log('[Metadata] No vault mounted, skip indexing.')
      return
    }

    this._isIndexing = true
    indexingWork.begin()
    console.log('[Metadata] Start indexing...')

    const abortController = new AbortController()
    const dispose = vault.on('change', () => abortController.abort())

    try {
      const { signal } = abortController
      const allFiles = await fs.listFiles(vaultPath, { recursive: true, signal })
      events.start(allFiles.length)

      signal.throwIfAborted()
      const vaultId = vault.id
      const indexingCache = await loadCache(vaultId)

      signal.throwIfAborted()
      // `runConcurrent` works on a copy, so `allFiles` stays intact for
      // `pruneCache` below.
      await runConcurrent(
        allFiles,
        concurrency,
        filePath => processor.processFile(indexingCache, vaultPath, filePath, undefined, signal),
        {
          signal,
          // Preserve the historical 0-based progress value expected by listeners.
          onProgress: done => events.progress(done - 1),
        },
      )

      signal.throwIfAborted()
      processor.pruneCache(indexingCache, vaultPath, allFiles)

      publish(indexingCache)
      events.done()
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
      this._isIndexing = false
      await indexingWork.end()
      console.log('[Metadata] Indexing completed.')
    }
  }
}
