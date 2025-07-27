import { JSBridge, reqnode } from "typora"
import type { FileStats, FileAdapter } from "./filesystem"
import { noop } from "src/utils"


const fs = reqnode?.('fs') as typeof import('fs')
const fsp = fs?.promises

export class NodeFS implements FileAdapter {

  access(filepath: string): Promise<void> {
    return fsp.access(filepath)
  }

  exists(filepath: string): Promise<boolean> {
    return fsp.access(filepath)
      .then(() => true)
      .catch(() => false)
  }

  stat(filepath: string): Promise<FileStats> {
    return fsp.stat(filepath) as unknown as Promise<FileStats>
  }

  mkdir(dirpath: string): Promise<void> {
    return fsp.mkdir(dirpath, { recursive: true })
      .then(noop)
  }

  copy(src: string, dest: string): Promise<void> {
    return fsp.cp(src, dest, { recursive: true })
  }

  move(src: string, dest: string): Promise<void> {
    return fsp.rename(src, dest)
      .catch(() => {
        const opts = { recursive: false }
        return fsp.stat(src)
          .then(s => { opts.recursive = s.isDirectory() })
          .then(() => fsp.cp(src, dest, opts))
          .then(() => fsp.rm(src, opts))
      })
  }

  list(dirpath: string): Promise<string[]> {
    return fsp.readdir(dirpath)
  }

  readText(filepath: string): Promise<string> {
    return fsp.readFile(filepath, 'utf8')
  }

  readTextSync(filepath: string): string {
    return fs.readFileSync(filepath, 'utf8')
  }

  writeText(filepath: string, text: string): Promise<void> {
    return fsp.writeFile(filepath, text, 'utf8')
  }

  appendText(filepath: string, text: string): Promise<void> {
    return fsp.appendFile(filepath, text, 'utf8')
  }

  remove(filepath: string): Promise<void> {
    return fsp.rm(filepath, { recursive: true })
  }

  trash(filepath: string): Promise<void> {
    return JSBridge.invoke('shell.trashItem', filepath)
  }
}
