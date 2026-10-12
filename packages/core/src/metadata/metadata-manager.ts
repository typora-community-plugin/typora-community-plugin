import fs from 'src/io/fs/filesystem'
import path from 'src/path'
import { editor, File } from 'typora'
import decorate from '@plylrnsdy/decorate.js'
import { StickyEvents } from 'src/common/events'
import { useService } from 'src/common/service'
import { MiniDexie } from 'src/utils/indexed-db'
import { TagObject } from 'src/utils'
import type { DisposeFunc } from 'src/utils/types'


class IndexAbortedError extends Error {
  constructor() {
    super('Indexing process was aborted.')
    this.name = 'IndexAbortedError'
  }
}

export type MetadataEvents = {
  // initial
  'index:start'(total: number): void
  'index:progress'(current: number): void
  'index:done'(): void

  // update
  'index:update'(filePath: string): void
}

class MetadataProviderContext {
  constructor(
    readonly filePath: string,
    private _textContent?: string,
    private _stats?: Awaited<ReturnType<typeof fs.stat>>
  ) { }

  text(): Promise<string> {
    return this._textContent
      ? Promise.resolve(this._textContent)
      : fs.readText(this.filePath).then(text => this._textContent = text)
  }

  fileStats(): Awaited<ReturnType<typeof fs.stat>> {
    return this._stats!
  }
}

export type MetadataProvider = (ctx: MetadataProviderContext) => Promise<Record<string, any>>

export type MergeStrategy =
  | 'replace'
  | 'deep'
  | 'concat'
  | 'concatUnique'

/** A merge declaration keyed by dot-path, e.g. `{ 'metadata.tags': 'concatUnique' }`. `'*'` is the fallback. */
export type MergeSpec = Record<string, MergeStrategy>

export interface RegisterOptions {
  merge?: MergeSpec
}

interface ProviderEntry {
  provider: MetadataProvider
  merge?: MergeSpec
}

/**
 * Merge the results of multiple metadata providers into a single object.
 *
 * The strategy for each key is resolved from the provider's {@link MergeSpec}
 * by dot-path (`spec[keyPath]`), falling back to `spec['*']` for array values,
 * and finally to a default: plain objects are merged deeply, everything else is
 * replaced.
 */
export function mergeMetadata(
  entries: { data: Record<string, any>; spec?: MergeSpec }[],
): Record<string, any> {
  return entries.reduce(
    (acc, { data, spec }) => mergeInto(acc, data, spec ?? {}, ''),
    {} as Record<string, any>,
  )
}

function mergeInto(
  target: Record<string, any>,
  source: Record<string, any>,
  spec: MergeSpec,
  path: string,
): Record<string, any> {
  for (const key of Object.keys(source)) {
    const keyPath = path ? `${path}.${key}` : key
    const value = source[key]
    const isArray = Array.isArray(value) || Array.isArray(target[key])
    // `'*'` only acts as the fallback for array values; objects always merge
    // deeply so intermediate namespaces (e.g. `metadata`) are not clobbered.
    const strategy = spec[keyPath]
      ?? (isArray ? spec['*'] : undefined)
      ?? defaultStrategy(target[key], value)

    target[key] = applyStrategy(strategy, target[key], value, spec, keyPath)
  }
  return target
}

function defaultStrategy(existing: any, incoming: any): MergeStrategy {
  return isPlainObject(existing) && isPlainObject(incoming) ? 'deep' : 'replace'
}

function applyStrategy(
  strategy: MergeStrategy,
  existing: any,
  incoming: any,
  spec: MergeSpec,
  keyPath: string,
): any {
  switch (strategy) {
    case 'deep':
      if (isPlainObject(existing) && isPlainObject(incoming)) {
        return mergeInto({ ...existing }, incoming, spec, keyPath)
      }
      return incoming
    case 'concat':
      return (Array.isArray(existing) ? existing : []).concat(
        Array.isArray(incoming) ? incoming : [incoming],
      )
    case 'concatUnique':
      return uniqueConcat(
        Array.isArray(existing) ? existing : [],
        Array.isArray(incoming) ? incoming : [incoming],
      )
    case 'replace':
    default:
      return incoming
  }
}

function uniqueConcat(existing: any[], incoming: any[]): any[] {
  const seen = new Set<string>()
  const result: any[] = []
  for (const item of [...existing, ...incoming]) {
    const key = dedupeKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

function dedupeKey(item: any): string {
  if (isPlainObject(item) && typeof item.name === 'string') return `name:${item.name}`
  return `json:${JSON.stringify(item)}`
}

function isPlainObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeExtension(ext: string): string {
  return ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
}

interface Cache {
  [filePath: string]: CacheEntry
}

interface CacheEntry {
  mtime: number // Last modification timestamp
  metadata: Record<string, any> & {
    frontmatter: Record<string, any>
    tags: TagObject[]
  }
}

const DB_SCHEMA = {
  files: 'path, metadata'
}

export class MetadataManager extends StickyEvents<MetadataEvents> {

  private providers: { [ext: string]: ProviderEntry[] } = {}
  cache: Cache = {}

  private concurrencyLimit: number
  private isIndexing: boolean = false
  private _quickOpenWorker: Worker | undefined
  private _pendingUpdates: Array<() => Promise<void>> = []
  private _drainingUpdates = false

  /**
   * @param options.concurrency Number of files processed simultaneously, default 10
   */
  constructor(
    options: { concurrency?: number } = {},
    markdownEditor = useService('markdown-editor'),
    workspace = useService('workspace'),
    private vault = useService('vault'),
  ) {
    super('metadata')
    this.concurrencyLimit = options.concurrency ?? 10

    this.setSticky('index:done')

    workspace.on('file:will-save', (file) => {
      const content = markdownEditor.getMarkdown()
      this.enqueueUpdate(() =>
        this.processFile(this.cache, this.vault.path, file, content)
          .then(() => {
            const relativePath = path.relative(this.vault.path, file)
            this.emit('index:update', relativePath)
          })
      ).catch(() => { })
    })

    // Keep the cache in sync with changes of the file system.
    this.vault.on('file:delete', (filePath) => this.remove(filePath))
    this.vault.on('file:rename', (oldPath, newPath) => this.rename(oldPath, newPath))
    this.vault.on('directory:rename', (oldPath, newPath) => this.rename(oldPath, newPath))

    // Keep the cache in sync with the native Quick Open worker.
    this._interceptQuickOpenWorker()

    // The worker is created lazily along with the panel, so re-attach on use.
    decorate.afterCall(editor.quickOpenPanel, 'initFileCache', () =>
      this._interceptQuickOpenWorker())
  }

  /**
   * Intercept the native Quick Open worker so that the files it adds or removes
   * (e.g. new files) are reflected in the metadata cache.
   *
   * Only the metadata cache is kept in sync; every message is still forwarded
   * to the original handler, so the native panel is not affected.
   */
  private _interceptQuickOpenWorker(): void {
    if (!File.isNode) return

    const worker = (editor.quickOpenPanel as any)?.worker as Worker | undefined
    if (!worker || worker === this._quickOpenWorker) return

    const original = worker.onmessage
    worker.onmessage = (event: MessageEvent) => {
      switch (event.data?.type) {
        case 'addInitFiles': {
          const [filePaths] = event.data.detail as [string[]]
          for (const filePath of filePaths) {
            this.update(filePath).catch(() => { })
          }
          break
        }
        case 'removeInitFiles': {
          const [prefix] = event.data.detail as [string]
          if (prefix) this.remove(prefix)
          break
        }
      }
      original?.call(worker, event)
    }

    this._quickOpenWorker = worker
  }

  /**
   * Register a metadata provider for a file extension (without the leading `.`).
   *
   * @returns A dispose function that unregisters the provider.
   */
  register(ext: string, provider: MetadataProvider, opts?: RegisterOptions): DisposeFunc {
    const key = normalizeExtension(ext)
    if (!this.providers[key]) this.providers[key] = []
    this.providers[key].push({ provider, merge: opts?.merge })
    return () => this.unregister(ext, provider)
  }

  /**
   * Unregister a previously registered metadata provider.
   *
   * Note: this only affects future processing. Metadata already merged into the
   * cache keeps the removed provider's data until the file is re-indexed.
   */
  unregister(ext: string, provider: MetadataProvider): void {
    const key = normalizeExtension(ext)
    const entries = this.providers[key]
    if (!entries) return

    const index = entries.findIndex(entry => entry.provider === provider)
    if (index === -1) return

    entries.splice(index, 1)
    if (entries.length === 0) delete this.providers[key]
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
      const indexingCache = await this.loadFromIndexedDb(vaultId)

      signal.throwIfAborted()
      await this.processQueue(indexingCache, vaultPath, allFiles, signal)

      signal.throwIfAborted()
      this.pruneCache(indexingCache, vaultPath, allFiles)

      this.cache = indexingCache
      this.emit('index:done')
      this.saveToIndexedDb(vaultId, indexingCache)

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
      if (this.providers[ext]?.length) {
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
    const providers = this.providers[ext]

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
      if (!content && cached && cached.mtime === mtime) {
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
      )

      indexingCache[relativePath] = mergedMetadata as any
    } catch (error) {
      if (error instanceof IndexAbortedError) throw error
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

      const relativePath = path.relative(this.vault.path, filePath)
      if (relativePath in this.cache) {
        this.emit('index:update', relativePath)
      }
    })
  }

  /**
   * Remove a file or a folder subtree (absolute path) from the cache.
   */
  remove(filePath: string): void {
    if (this.isIndexing) {
      this._pendingUpdates.push(async () => this.remove(filePath))
      return
    }

    const relativePath = path.relative(this.vault.path, filePath)
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
      new MiniDexie(`metadata:${this.vault.id}`)
        .version(1).stores(DB_SCHEMA)
        .files.bulkDelete(removed)
        .catch((e: unknown) => console.error('[Metadata] Failed to delete from IndexedDB:', e))
      this.emit('index:update', relativePath)
    }
  }

  /**
   * Move a file or a folder subtree (absolute paths) in the cache.
   */
  rename(oldPath: string, newPath: string): void {
    if (this.isIndexing) {
      this._pendingUpdates.push(async () => this.rename(oldPath, newPath))
      return
    }

    const oldRelative = path.relative(this.vault.path, oldPath)
    const newRelative = path.relative(this.vault.path, newPath)
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

    this.emit('index:update', newRelative)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache = {}
  }

  async loadFromIndexedDb(vaultId: string): Promise<Cache> {
    const loadedCache: Cache = {}

    try {
      const db = new MiniDexie(`metadata:${vaultId}`)
        .version(1).stores(DB_SCHEMA)

      const records = await db.files.toArray()
      for (const record of records) {
        const { path, metadata } = record
        loadedCache[path] = metadata as CacheEntry
      }

      console.log(`[Metadata] Loaded ${records.length} items from IndexedDB.`)
    } catch (e) {
      console.error('[Metadata] Failed to load IndexedDB:', e)
    }

    return loadedCache
  }

  async saveToIndexedDb(vaultId: string, cache: Cache): Promise<void> {
    try {
      const db = new MiniDexie(`metadata:${vaultId}`)
        .version(1).stores(DB_SCHEMA)

      const rows = Object.entries(cache).map(([filePath, metadata]) => ({
        path: filePath,
        metadata,
      }))

      // Replace the whole store so entries removed from the cache do not linger.
      await db.files.clear()
      await db.files.bulkPut(rows)
      console.log(`[Metadata] Saved ${rows.length} items to IndexedDB.`)
    } catch (e) {
      console.error('[Metadata] Failed to save IndexedDB:', e)
    }
  }
}
