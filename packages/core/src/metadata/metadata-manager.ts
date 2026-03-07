import fs from 'src/io/fs/filesystem'
import path from 'src/path'
import { Events } from 'src/common/events'
import { useService } from 'src/common/service'


class IndexAbortedError extends Error {
  constructor() {
    super('Indexing process was aborted.')
    this.name = 'IndexAbortedError'
  }
}

export type MeatdataEvents = {
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

export class MetadataManager extends Events<MeatdataEvents> {

  private providers: { [ext: string]: MetadataProvider[] } = {}
  cache: Cache = {}

  private vaultPath: string
  private concurrencyLimit: number
  private isIndexing: boolean = false
  private abortRequested: boolean = false

  /**
   * @param options.concurrency Number of files processed simultaneously, default 10
   */
  constructor(
    options: { concurrency?: number } = {},
    editor = useService('markdown-editor'),
    workspace = useService('workspace'),
    vault = useService('vault'),
  ) {
    super('metadata')
    this.concurrencyLimit = options.concurrency ?? 10

    workspace.on('file:will-save', (file) => {
      this.processFile(this.cache, file, editor.getMarkdown()).catch(() => { })
    })

    this.vaultPath = vault.path
    vault.on('change', path => { this.vaultPath = path })
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
   * Stop the current indexing process
   */
  stopIndex(): void {
    if (this.isIndexing) {
      this.abortRequested = true
    }
  }

  private checkAbort() {
    if (this.abortRequested) {
      throw new IndexAbortedError()
    }
  }

  /**
   * Index files in the vault
   */
  async index() {
    if (this.isIndexing) {
      throw new Error("Indexing is already in progress.")
    }

    this.isIndexing = true
    this.abortRequested = false

    try {
      const indexingCache: Cache = {}
      const allFiles = await this.getAllFiles(this.vaultPath)

      await this.processQueue(indexingCache, allFiles)

      this.cache = indexingCache
      this.emit('index')

    } catch (error) {
      if (error instanceof IndexAbortedError) {
        console.log('Indexing stopped, temporary cache discarded')
      } else {
        console.error('Indexing failed due to error:', error)
        throw error
      }
    } finally {
      this.isIndexing = false
      this.abortRequested = false
    }
  }

  /**
   * Recursively list all files in directory
   */
  private async getAllFiles(dirPath: string): Promise<string[]> {
    this.checkAbort()

    const names = await fs.list(dirPath)
    const files: string[] = []

    for (const name of names) {
      this.checkAbort()

      const filePath = path.join(dirPath, name)
      try {
        const isDirectory = await fs.isDirectory(filePath)
        if (isDirectory) {
          const subFiles = await this.getAllFiles(filePath)
          files.push(...subFiles)
        } else {
          files.push(filePath)
        }
      } catch (error) {
        if (error instanceof IndexAbortedError) throw error
        console.warn(`Failed to process ${filePath}:`, error)
      }
    }

    return files
  }

  private async processQueue(indexingCache: Cache, filePaths: string[]): Promise<void> {
    const worker = async () => {
      while (filePaths.length > 0) {
        this.checkAbort()
        const filePath = filePaths.pop()
        if (filePath) {
          await this.processFile(indexingCache, filePath)
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
  private async processFile(indexingCache: Cache, filePath: string, content?: string): Promise<void> {
    this.checkAbort()

    const ext = path.extname(filePath).toLowerCase()
    const providers = this.providers[ext]

    if (!providers || providers.length === 0) return

    try {
      const stats = await fs.stat(filePath)
      const mtime = stats.mtimeMs
      const relativePath = path.relative(this.vaultPath, filePath)

      const cached = this.cache[relativePath]
      if (cached && cached.mtime === mtime) {
        indexingCache[relativePath] = cached
        return
      }

      const context = new MetadataProviderContext(filePath, content)

      const results = await Promise.all(
        providers.map(async (p) => {
          this.checkAbort()
          try {
            return await p(context)
          } catch (e) {
            console.warn(`Provider error in ${filePath}:`, e)
            return {}
          }
        })
      )

      this.checkAbort()

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
}
