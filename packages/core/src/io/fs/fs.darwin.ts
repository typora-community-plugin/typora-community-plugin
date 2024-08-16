import { bridge } from "typora"
import { Shell } from "src/io/shell"
import type { FileStats, FileAdapter } from "./filesystem"


class MacFileStats implements FileStats {
  constructor(private info: string) {
  }

  isDirectory() {
    return this.info.includes('FileType: Directory')
  }

  isFile() {
    return this.info.includes('FileType: Regular File')
  }
}

export class MacFS implements FileAdapter {

  access(filepath: string): Promise<void> {
    return this.exists(filepath)
      .then(bool => bool ? Promise.resolve() : Promise.reject())
  }

  exists(filepath: string): Promise<boolean> {
    return Shell.run(`test -e '${filepath}'`)
      .then(() => true)
      .catch(() => false)
  }

  stat(filepath: string): Promise<MacFileStats> {
    return Shell.run(`stat '${filepath}'`)
      .then((out: string) => new MacFileStats(out))
  }

  mkdir(dirpath: string): Promise<void> {
    return Shell.run(`mkdir -p '${dirpath}'`) as Promise<void>
  }

  copy(src: string, dest: string): Promise<void> {
    return Shell.run(`cp -r '${src}' '${dest}'`) as Promise<void>
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
