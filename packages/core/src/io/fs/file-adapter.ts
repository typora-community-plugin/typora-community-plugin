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
          const subFiles = await this.listFiles(filePath)
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
}

export type ListFilesOptions = {
  recursive?: boolean,
  signal?: AbortSignal,
}
