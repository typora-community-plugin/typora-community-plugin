import { bridge, File, JSBridge, reqnode } from "typora"
import { Shell } from 'src/utils/shell'

const fs = reqnode?.('fs') as typeof import('fs')
const fsp = fs?.promises


interface IFileSystem {

  access(filepath: string): Promise<void>
  exists(filepath: string): Promise<boolean>

  stat(filepath: string): Promise<Stats>

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

class NodeFS implements IFileSystem {

  access(filepath: string): Promise<void> {
    return fsp.access(filepath)
  }

  exists(filepath: string): Promise<boolean> {
    return fsp.access(filepath)
      .then(() => true)
      .catch(() => false)
  }

  stat(filepath: string): Promise<Stats> {
    return fsp.stat(filepath) as unknown as Promise<Stats>
  }

  mkdir(dirpath: string): Promise<void> {
    return fsp.mkdir(dirpath, { recursive: true })
      .then(() => void 0)
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

class MacFS implements IFileSystem {

  access(filepath: string): Promise<void> {
    return this.exists(filepath)
      .then(bool => bool ? Promise.resolve() : Promise.reject())
  }

  exists(filepath: string): Promise<boolean> {
    return Shell.run(`test -e '${filepath}'`)
      .then(() => true)
      .catch(() => false)
  }

  stat(filepath: string): Promise<Stats> {
    return Shell.run(`stat '${filepath}'`)
      .then((out: string) => new Stats(out))
  }

  mkdir(dirpath: string): Promise<void> {
    return Shell.run(`mkdir -p '${dirpath}'`) as Promise<void>
  }

  move(src: string, dest: string): Promise<void> {
    return Shell.run(`mv -f '${src}' '${dest}'`) as Promise<void>
  }

  list(dirpath: string): Promise<string[]> {
    return Shell.run(`ls '${dirpath}'`)
      .then((out: string) => out.trim().split('\n'))
  }

  readText(filepath: string): Promise<string> {
    return Promise.resolve(this.readTextSync(filepath))
  }

  readTextSync(filepath: string): string {
    return bridge.callSync('path.readText', filepath)
  }

  writeText(filepath: string, text: string): Promise<void> {
    return Shell.run(`echo ${Shell.escape(text)} > '${filepath}'`) as Promise<void>
  }

  appendText(filepath: string, text: string): Promise<void> {
    return Shell.run(`cat ${Shell.escape(text)} >> '${filepath}'`) as Promise<void>
  }

  remove(filepath: string): Promise<void> {
    return Shell.run(`rm -r '${filepath}'`) as Promise<void>
  }

  trash(filepath: string): Promise<void> {
    return new Promise(resolve => {
      bridge.callHandler("library.trashItem", filepath, resolve)
    })
  }
}

class Stats {
  constructor(private info: string) {
  }

  isDirectory() {
    return this.info.includes('FileType: Directory')
  }

  isFile() {
    return this.info.includes('FileType: Regular File')
  }
}

const filesystem: IFileSystem = File.isNode ? new NodeFS() : new MacFS()

export default filesystem
