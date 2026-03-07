import fs from 'src/io/fs/filesystem'
import path from 'src/path'
import { Events } from 'src/common/events'
import { useService } from 'src/common/service'


export type MeatdataEvents = {
  'indexed'(): void
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

interface CacheEntry {
  mtime: number // Last modification timestamp
  metadata: Record<string, any>
  [prop: string]: any
}

export class MetadataManager extends Events<MeatdataEvents> {

  private providers: { [ext: string]: MetadataProvider[] } = {}
  cache: { [filePath: string]: CacheEntry } = {}

  private concurrencyLimit: number
  private stopRequested: boolean = false
  private isIndexing: boolean = false

  /**
   * @param options.concurrency Number of files processed simultaneously, default 10
   */
  constructor(
    options: { concurrency?: number } = {},
    editor = useService('markdown-editor'),
    workspace = useService('workspace'),
  ) {
    super('metadata')
    this.concurrencyLimit = options.concurrency ?? 10

    workspace.on('file:will-save', (file) => {
      this.processFile(file, editor.getMarkdown())
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
   * Stop the current indexing process
   */
  stopIndex(): void {
    if (this.isIndexing) {
      this.stopRequested = true
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
    this.stopRequested = false

    try {
      const dirPath = useService('vault').path
      const allFiles = await this.getAllFiles(dirPath)

      // Process files in parallel with concurrency control
      await this.processQueue(allFiles)

      this.emit('indexed')
    } finally {
      this.isIndexing = false
      this.stopRequested = false
    }
  }

  /**
   * Recursively list all files in directory
   */
  private async getAllFiles(dirPath: string): Promise<string[]> {
    // Check stop flag even during file discovery
    if (this.stopRequested) return []

    const names = await fs.list(dirPath)
    const files = await Promise.all(
      names.map(async (name) => {
        const filePath = path.join(dirPath, name)
        const isDirectory = (await fs.stat(filePath)).isDirectory()
        return isDirectory ? this.getAllFiles(filePath) : filePath
      })
    );
    return files.flat()
  }

  private async processQueue(filePaths: string[]): Promise<void> {
    const queue = [...filePaths]
    const workers = []

    const worker = async () => {
      while (queue.length > 0 && !this.stopRequested) {
        const filePath = queue.shift()
        if (filePath) {
          await this.processFile(filePath)
        }
      }
    };

    const count = Math.min(this.concurrencyLimit, filePaths.length)
    for (let i = 0; i < count; i++) {
      workers.push(worker())
    }

    await Promise.all(workers)
  }

  /**
   * Process a single file: with cache check and providers
   */
  private async processFile(filePath: string, content?: string): Promise<void> {
    // Immediate exit if stop requested
    if (this.stopRequested) return

    const ext = path.extname(filePath).toLowerCase()
    const providers = this.providers[ext]

    if (!providers || providers.length === 0) return

    try {
      const stats = await fs.stat(filePath)
      const mtime = stats.mtimeMs

      const cached = this.cache[filePath]
      if (cached && cached.mtime === mtime) {
        return
      }

      const context = new MetadataProviderContext(filePath, content)
      const results = await Promise.all(
        providers.map(async (p) => {
          // Double check stop flag before potentially heavy provider execution
          if (this.stopRequested) return {}
          try {
            return await p(context)
          } catch (e) {
            console.warn(`Provider error in ${filePath}:`, e)
            return {}
          }
        })
      );

      if (this.stopRequested) return

      const mergedMetadata = results.reduce((acc, curr) => ({ ...acc, ...curr }), {})
      this.cache[filePath] = {
        mtime,
        metadata: mergedMetadata
      }
    } catch (error) {
      console.error(`Failed to process ${filePath}:`, error)
    }
  }
}
