import { File } from "typora"
import { NodeFS } from "./fs.node"
import { MacFS } from "./fs.darwin"


export interface FileAdapter {

  access(filepath: string): Promise<void>
  exists(filepath: string): Promise<boolean>

  stat(filepath: string): Promise<FileStats>

  mkdir(dirpath: string): Promise<void>
  move(src: string, dest: string): Promise<void>
  list(dirpath: string): Promise<string[]>

  readText(filepath: string): Promise<string>
  readTextSync(filepath: string): string

  writeText(filepath: string, text: string): Promise<void>

  appendText(filepath: string, text: string): Promise<void>

  remove(filepath: string): Promise<void>
  trash(filepath: string): Promise<void>
}

export interface FileStats {
  isDirectory(): boolean
  isFile(): boolean
}

const filesystem: FileAdapter = File.isNode ? new NodeFS() : new MacFS()

export default filesystem
