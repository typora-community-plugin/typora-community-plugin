import { File } from "typora"
import { NodeFS } from "./fs.node"
import { MacFS } from "./fs.darwin"


export interface FileAdapter {

  /**
   * In macOS, it's very slow (about 2s).
   */
  access(filepath: string): Promise<void>
  /**
   * In macOS, it's very slow (about 2s).
   */
  exists(filepath: string): Promise<boolean>

  /**
   * In macOS, it's very slow.
   */
  stat(filepath: string): Promise<FileStats>

  /**
   * In macOS, it's very slow.
   */
  mkdir(dirpath: string): Promise<void>
  /**
   * In macOS, it's very slow.
   */
  copy(src: string, dest: string): Promise<void>
  /**
   * In macOS, it's very slow.
   */
  move(src: string, dest: string): Promise<void>
  /**
   * In macOS, it's very slow.
   */
  list(dirpath: string): Promise<string[]>

  readText(filepath: string): Promise<string>
  readTextSync(filepath: string): string

  /**
   * In macOS, it's very slow.
   */
  writeText(filepath: string, text: string): Promise<void>
  /**
   * In macOS, it's very slow.
   */
  appendText(filepath: string, text: string): Promise<void>

  /**
   * In macOS, it's very slow.
   */
  remove(filepath: string): Promise<void>
  trash(filepath: string): Promise<void>
}

export interface FileStats {
  isDirectory(): boolean
  isFile(): boolean
}

const filesystem: FileAdapter = File.isNode ? new NodeFS() : new MacFS()

export default filesystem
