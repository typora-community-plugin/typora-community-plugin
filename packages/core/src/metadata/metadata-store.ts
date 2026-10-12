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

export async function loadCache(vaultId: string): Promise<Cache> {
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

export async function saveCache(vaultId: string, cache: Cache): Promise<void> {
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

export async function deleteCacheEntries(vaultId: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return

  try {
    const db = new MiniDexie(`metadata:${vaultId}`)
      .version(1).stores(DB_SCHEMA)

    await db.files.bulkDelete(paths)
  } catch (e) {
    console.error('[Metadata] Failed to delete from IndexedDB:', e)
  }
}
