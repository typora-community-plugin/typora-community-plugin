import path from "src/path"


export abstract class FileAdapter {

  /**
   * On macOS, it's very slow (about 2s).
   */
  abstract access(filepath: string): Promise<void>
  /**
   * On macOS, it's very slow (about 2s).
   */
  abstract exists(filepath: string): Promise<boolean>

  /**
   * On macOS, it's very slow.
   */
  abstract stat(filepath: string): Promise<FileStats>
  /**
   * On macOS, it's faster than `(await fs.stat(file)).isDirectory()`
   */
  abstract isDirectory(filepath: string): Promise<boolean>

  /**
   * Returns `false` when the path does not exist.
   *
   * The default implementation avoids `stat()`, which needs a shell command on
   * macOS: `isDirectory()` and `exists()` both use Typora's bridge handlers.
   */
  async isFile(filepath: string): Promise<boolean> {
    if (await this.isDirectory(filepath)) return false
    return this.exists(filepath)
  }

  /**
   * On macOS, it's very slow.
   */
  abstract mkdir(dirpath: string): Promise<void>
  /**
   * On macOS, it's very slow.
   */
  abstract copy(src: string, dest: string): Promise<void>
  /**
   * On macOS, it's very slow.
   */
  abstract move(src: string, dest: string): Promise<void>

  /**
   * On macOS, it's very slow.
   */
  abstract list(dirpath: string): Promise<string[]>

  /**
   * List directory names only.
   *
   * The default implementation filters `list()` with `isDirectory()`, which
   * avoids a shell command per entry on macOS. Platform adapters may override
   * it with a faster native implementation.
   */
  async listDirs(dirpath: string): Promise<string[]> {
    const names = await this.list(dirpath)
    const dirs: string[] = []

    for (const name of names) {
      if (await this.isDirectory(path.join(dirpath, name))) {
        dirs.push(name)
      }
    }

    return dirs
  }

  /**
   * List files together with modification times when the platform can provide
   * them without extra shell commands.
   *
   * Returns `undefined` when the adapter has no native implementation, so
   * callers fall back to `listFiles()` + `stat()`.
   */
  async listFilesWithStats(
    _dirpath: string,
    _options: ListFilesOptions = {},
  ): Promise<FileTreeEntry[] | undefined> {
    return undefined
  }

  /**
   * On macOS, it's very slow.
   */
  async listFiles(dirpath: string, options: ListFilesOptions = {}): Promise<string[]> {
    const { recursive = false, signal } = options
    signal?.throwIfAborted()

    const names = await this.list(dirpath)
    const files: string[] = []

    for (const name of names) {
      signal?.throwIfAborted()

      const filePath = path.join(dirpath, name)
      const isDirectory = await this.isDirectory(filePath)
      if (isDirectory) {
        if (recursive) {
          const subFiles = await this.listFiles(filePath, options)
          files.push(...subFiles)
        }
      } else {
        files.push(filePath)
      }
    }

    return files
  }

  abstract readText(filepath: string): Promise<string>
  abstract readTextSync(filepath: string): string

  /**
   * On macOS, it's very slow.
   */
  abstract writeText(filepath: string, text: string): Promise<void>
  /**
   * On macOS, it's very slow.
   */
  abstract appendText(filepath: string, text: string): Promise<void>

  /**
   * On macOS, it's very slow.
   */
  abstract remove(filepath: string): Promise<void>
  abstract trash(filepath: string): Promise<void>
}

export interface FileStats {
  isDirectory(): boolean
  isFile(): boolean
  mtimeMs: number
  size: number
}

export interface FileTreeEntry {
  path: string
  /** Modification time in milliseconds, when available without an extra shell command. */
  mtimeMs?: number
  /** File size in bytes, when available without an extra shell command. */
  size?: number
}

export type ListFilesOptions = {
  recursive?: boolean,
  signal?: AbortSignal,
}
