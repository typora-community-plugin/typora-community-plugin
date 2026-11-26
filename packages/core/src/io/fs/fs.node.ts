import { noop } from "src/utils"
import { JSBridge } from "typora"
import { FileAdapter, type FileStats } from "./file-adapter"


// `reqnode` is a bare Electron global: on macOS (WKWebView) the identifier does
// not exist at all, and even `reqnode?.()` throws a ReferenceError while this
// module is evaluated by the NodeFS chunk. Read it off `globalThis` instead.
const fs = (globalThis as { reqnode?: (module: string) => any }).reqnode?.('fs') as typeof import('fs')
const fsp = fs?.promises

export class NodeFS extends FileAdapter {

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

  isDirectory(filepath: string): Promise<boolean> {
    return fsp.stat(filepath).then(stat => stat.isDirectory())
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

  listDirs(dirpath: string): Promise<string[]> {
    return fsp.readdir(dirpath, { withFileTypes: true })
      .then(entries => entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name))
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
