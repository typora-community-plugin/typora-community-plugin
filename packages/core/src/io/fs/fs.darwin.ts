import { isCommandCancelled, Shell } from "src/io/shell"
import { bridge, JSBridge } from "typora"
import { FileAdapter, type FileStats } from "./file-adapter"


class MacFileStats implements FileStats {
  constructor(private info: string) {
  }

  isDirectory() {
    return this.info.includes('FileType: Directory')
  }

  isFile() {
    return this.info.includes('FileType: Regular File')
  }

  get mtimeMs() {
    const [, modifyStr] = this.info.match(/Modify:\s+(.*)/) ?? []
    if (!modifyStr) return undefined

    const date = new Date(modifyStr)
    return date.getTime()
  }

  get size() {
    const match = this.info.match(/Size:\s+(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }
}

export class MacFS extends FileAdapter {

  access(filepath: string): Promise<void> {
    return this.exists(filepath).then(exists => {
      if (!exists) {
        throw new Error(`ENOENT: no such file or directory, access '${filepath}'`)
      }
    })
  }

  async exists(filepath: string): Promise<boolean> {
    const isDirectory = await this._isDirectory(filepath)
    if (isDirectory === true) return true

    const existsByReading = await this._existsByReading(filepath)
    if (existsByReading !== undefined) return existsByReading

    try {
      await this._accessByShell(filepath)
      return true
    }
    catch (error) {
      if (isCommandCancelled(error)) throw error
      return false
    }
  }

  stat(filepath: string): Promise<MacFileStats> {
    return Shell.run(`stat ${Shell.escape(filepath)}`)
      .then((out: string) => new MacFileStats(out))
  }

  isDirectory(filepath: string): Promise<boolean> {
    return new Promise(resolve =>
      bridge.callHandler('path.isDirectory', filepath, resolve))
  }

  mkdir(dirpath: string): Promise<void> {
    return Shell.run(`mkdir -p ${Shell.escape(dirpath)}`) as Promise<void>
  }

  async copy(src: string, dest: string): Promise<void> {
    if (await this._isDirectory(src) === true) {
      return Shell.run(`cp -r ${Shell.escape(src)} ${Shell.escape(dest)}`) as Promise<void>
    }

    try {
      const copied = await JSBridge.invoke('path.copyFile', { from: src, to: dest })
      if (!copied) throw new Error(`Failed to copy '${src}' to '${dest}'.`)
    }
    catch (error) {
      if (isCommandCancelled(error)) throw error
      return Shell.run(`cp -r ${Shell.escape(src)} ${Shell.escape(dest)}`) as Promise<void>
    }
  }

  async move(src: string, dest: string): Promise<void> {
    if (await this._isDirectory(src) === true) {
      return Shell.run(`mv -f ${Shell.escape(src)} ${Shell.escape(dest)}`) as Promise<void>
    }

    try {
      const moved = await JSBridge.invoke('path.moveFile', { from: src, to: dest })
      if (!moved) throw new Error(`Failed to move '${src}' to '${dest}'.`)
    }
    catch (error) {
      if (isCommandCancelled(error)) throw error
      return Shell.run(`mv -f ${Shell.escape(src)} ${Shell.escape(dest)}`) as Promise<void>
    }
  }

  list(dirpath: string): Promise<string[]> {
    return Shell.run(`ls ${Shell.escape(dirpath)}`)
      .then((out: string) => {
        const text = String(out ?? '').trim()
        return text ? text.split(/\r?\n/) : []
      })
  }

  readText(filepath: string): Promise<string> {
    return Promise.resolve().then(() => this.readTextSync(filepath))
  }

  readTextSync(filepath: string): string {
    return bridge.callSync('path.readText', filepath)
  }

  writeText(filepath: string, text: string): Promise<void> {
    return Shell.run(`printf '%s\\n' ${Shell.escape(text)} > ${Shell.escape(filepath)}`) as Promise<void>
  }

  appendText(filepath: string, text: string): Promise<void> {
    return Shell.run(`printf '%s' ${Shell.escape(text)} >> ${Shell.escape(filepath)}`) as Promise<void>
  }

  async remove(filepath: string): Promise<void> {
    if (await this._isDirectory(filepath) === true) {
      return Shell.run(`rm -r ${Shell.escape(filepath)}`) as Promise<void>
    }

    try {
      const removed = await JSBridge.invoke('path.delete', filepath)
      if (removed === false) {
        throw new Error(`Failed to remove '${filepath}'.`)
      }
    }
    catch (error) {
      if (isCommandCancelled(error)) throw error
      return Shell.run(`rm -r ${Shell.escape(filepath)}`) as Promise<void>
    }
  }

  /**
   * If the file is not exists, it will show a dialog.
   */
  trash(filepath: string): Promise<void> {
    return new Promise(resolve => {
      bridge.callHandler("library.trashItem", filepath, resolve)
    })
  }

  private _isDirectory(filepath: string): Promise<boolean | undefined> {
    return this.isDirectory(filepath).catch((): undefined => undefined)
  }

  private _accessByShell(filepath: string) {
    return Shell.run(`test -e ${Shell.escape(filepath)}`) as Promise<void>
  }

  /**
   * Check a file without `controller.runCommand`.
   *
   * `path.readTextLimited` was added in Typora 1.14.15 and returns JSON like
   * `{ content }`, `{ tooLarge: true }`, `{ binary: true }` or `{ error }`.
   * Returns `undefined` when the handler is unavailable (older Typora).
   */
  private async _existsByReading(filepath: string): Promise<boolean | undefined> {
    try {
      const raw = bridge.callSync('path.readTextLimited', filepath)
      if (typeof raw !== 'string' || !raw) return undefined

      let info: any
      try {
        info = JSON.parse(raw)
      }
      catch {
        return undefined
      }
      if (!info || typeof info !== 'object') return undefined

      if (info.error === 'stat' || info.error === 'path') return false
      if (info.error) return true
      if (info.tooLarge || info.binary) return true
      if (typeof info.content === 'string') return true
      return false
    }
    catch {
      return undefined
    }
  }
}
