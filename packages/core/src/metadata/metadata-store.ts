import { MiniDexie } from 'src/utils/indexed-db'
import { TagObject } from 'src/utils'


export interface CacheEntry {
  mtime: number // Last modification timestamp
  metadata: Record<string, any> & {
    frontmatter: Record<string, any>
    tags: TagObject[]
  }
}

export interface Cache {
  [filePath: string]: CacheEntry
}

const DB_SCHEMA = {
  files: 'path, metadata'
}

function dbKey(vaultId: string): string {
  return `metadata:${vaultId}`
}

/** Cache of in-flight/opened connections, keyed by database name. */
const dbCache = new Map<string, Promise<MiniDexie>>()

function openDb(vaultId: string): Promise<MiniDexie> {
  const key = dbKey(vaultId)
  const cached = dbCache.get(key)
  if (cached) return cached

  const db = new MiniDexie(key).version(1).stores(DB_SCHEMA)
  const pending = db._getDb().then(() => db)

  // Drop the cached connection if it is closed externally (e.g. version change).
  db.onEvict = () => {
    if (dbCache.get(key) === pending) dbCache.delete(key)
  }
  dbCache.set(key, pending)

  // Do not cache failed opens.
  pending.catch(() => {
    if (dbCache.get(key) === pending) dbCache.delete(key)
  })

  return pending
}

/** Close and evict the cached connection for a vault. */
export function closeCache(vaultId: string): void {
  const key = dbKey(vaultId)
  const pending = dbCache.get(key)
  if (!pending) return

  dbCache.delete(key)
  pending.then(db => db.close()).catch(() => { })
}

/** Run `fn` against the vault's connection, logging the failure of an operation. */
async function withDb<T>(
  vaultId: string,
  action: string,
  fn: (db: MiniDexie) => Promise<T>,
): Promise<T | undefined> {
  try {
    return await fn(await openDb(vaultId))
  } catch (e) {
    console.error(`[Metadata] Failed to ${action} IndexedDB:`, e)
    return undefined
  }
}

export async function loadCache(vaultId: string): Promise<Cache> {
  const loadedCache: Cache = {}

  await withDb(vaultId, 'load', async db => {
    const records = await db.files.toArray()
    for (const record of records) {
      const { path, metadata } = record
      loadedCache[path] = metadata as CacheEntry
    }

    console.log(`[Metadata] Loaded ${records.length} items from IndexedDB.`)
  })

  return loadedCache
}

export async function saveCache(vaultId: string, cache: Cache): Promise<void> {
  await withDb(vaultId, 'save', async db => {
    const rows = Object.entries(cache).map(([filePath, metadata]) => ({
      path: filePath,
      metadata,
    }))

    // Replace the whole store so entries removed from the cache do not linger.
    await db.files.clear()
    await db.files.bulkPut(rows)
    console.log(`[Metadata] Saved ${rows.length} items to IndexedDB.`)
  })
}

export async function deleteCacheEntries(vaultId: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return

  await withDb(vaultId, 'delete from', async db => {
    await db.files.bulkDelete(paths)
  })
}
