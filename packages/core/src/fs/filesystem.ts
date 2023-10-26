import { bridge, File, JSBridge, reqnode } from "typora"
import { Shell } from 'src/utils/shell'

const fs = reqnode?.('fs') as typeof import('fs')
const fsp = fs?.promises


interface IFileSystem {

  exists(filepath: string): Promise<boolean>

  stat(filepath: string): Promise<Stats>

  mkdir(dirpath: string): Promise<void>
  move(src: string, dest: string): Promise<void>
  list(dirpath: string): Promise<string[]>

  read(filepath: string): Promise<string>
  readSync(filepath: string): string

  write(filepath: string, text: string): Promise<void>

  append(filepath: string, text: string): Promise<void>

  remove(filepath: string): Promise<void>
  trash(filepath: string): Promise<void>
}

class NodeFS implements IFileSystem {

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
  }

  list(dirpath: string): Promise<string[]> {
    return fsp.readdir(dirpath)
  }

  read(filepath: string): Promise<string> {
    return fsp.readFile(filepath, 'utf8')
  }

  readSync(filepath: string): string {
    return fs.readFileSync(filepath, 'utf8')
  }

  write(filepath: string, text: string): Promise<void> {
    return fsp.writeFile(filepath, text, 'utf8')
  }

  append(filepath: string, text: string): Promise<void> {
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
    return Shell.run(`mv -f '${src}/*' '${dest}'`) as Promise<void>
  }

  list(dirpath: string): Promise<string[]> {
    return Shell.run(`ls '${dirpath}'`)
      .then((out: string) => out.trim().split('\n'))
  }

  read(filepath: string): Promise<string> {
    return Promise.resolve(this.readSync(filepath))
  }

  readSync(filepath: string): string {
    return bridge.callSync('path.readText', filepath)
  }

  write(filepath: string, text: string): Promise<void> {
    return Shell.run(`echo ${Shell.escape(text)} > '${filepath}'`) as Promise<void>
  }

  append(filepath: string, text: string): Promise<void> {
    return Shell.run(`cat ${Shell.escape(text)} >> '${filepath}'`) as Promise<void>
  }

  remove(filepath: string): Promise<void> {
    return new Promise(resolve => {
      bridge.callHandler("path.removeFiles", [filepath], resolve)
    })
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
