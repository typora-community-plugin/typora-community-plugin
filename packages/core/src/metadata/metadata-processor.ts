import fs from 'src/io/fs/filesystem'
import path from 'src/path'
import { mergeMetadata } from './metadata-merge'
import { MetadataProviderContext, MetadataProviderRegistry } from './metadata-provider-registry'
import type { Cache, CacheEntry } from './metadata-store'


/**
 * Computes the metadata for a single file using the providers registered for
 * its extension, and prunes cache entries that are no longer valid.
 */
export class MetadataProcessor {

  constructor(private registry: MetadataProviderRegistry) { }

  /**
   * Drop cache entries that no longer correspond to an existing file with a
   * registered provider, so that deleted files do not resurrect from IndexedDB.
   */
  pruneCache(cache: Cache, vaultPath: string, filePaths: string[]): void {
    const keep = new Set<string>()
    for (const filePath of filePaths) {
      const ext = path.extname(filePath).toLowerCase()
      if (this.registry.get(ext)?.length) {
        keep.add(path.relative(vaultPath, filePath))
      }
    }

    for (const key of Object.keys(cache)) {
      if (!keep.has(key)) delete cache[key]
    }
  }

  /**
   * Process a single file: with cache check and providers
   */
  async processFile(cache: Cache, vaultPath: string, filePath: string, content?: string, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted()

    const ext = path.extname(filePath).toLowerCase()
    const providers = this.registry.get(ext)

    if (!providers || providers.length === 0) return

    try {
      const stats = await fs.stat(filePath)
      const mtime = stats.mtimeMs
      const relativePath = path.relative(vaultPath, filePath)

      const cached = cache[relativePath]
      // When content is provided (from file:will-save with editor content),
      // skip the mtime check — the file hasn't been written to disk yet so
      // mtime is still old. Without this, the provider never processes the
      // new content and the cache stays stale.
      //
      // The cache is also treated as stale when the provider set for the
      // extension changed, so metadata produced before a provider was added,
      // removed or replaced is re-processed instead of being reused by mtime.
      if (!content && cached && cached.mtime === mtime
        && cached.providerSignature === this.registry.getSignature(ext)) {
        cache[relativePath] = cached
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

      mergedMetadata.providerSignature = this.registry.getSignature(ext)
      cache[relativePath] = mergedMetadata
    } catch (error) {
      console.error(`Failed to process ${filePath}:`, error)
    }
  }
}
