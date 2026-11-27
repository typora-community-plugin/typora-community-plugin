import { macHelper } from "src/io/helper"
import { type HelperListInfo, type HelperStatInfo, HelperUnavailableError } from "src/io/helper/protocol"
import { isCommandCancelled, Shell } from "src/io/shell"
import path from "src/path"
import { bridge, JSBridge } from "typora"
import { FileAdapter, type FileStats, type FileTreeEntry, type ListFilesOptions } from "./file-adapter"


/**
 * `list` / `listDirs` answer `{ names }`; the shell and bridge fallbacks answer
 * a plain array. Normalize both so callers always get names.
 */
function toNames(result: string[] | HelperListInfo): string[] {
  return Array.isArray(result) ? result : result.names
}

function toTimeMs(value: unknown): number | undefined {
  if (value instanceof Date) return value.getTime()

  if (typeof value === 'number') {
    // Accept both epoch milliseconds and epoch seconds.
    return value < 1e12 ? value * 1000 : value
  }

  if (typeof value === 'string') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? undefined : time
  }

  return undefined
}


class MacFileStats implements FileStats {
  private readonly type: string
  private readonly mtime: number
  private readonly bytes: number

  constructor(info: string) {
    // `stat -f '%m %z %HT'` output, e.g. `1795698131 334 Regular File`.
    const [mtime = '0', size = '0', ...type] = info.trim().split(/\s+/)
    this.mtime = Number.parseFloat(mtime) * 1000
    this.bytes = Number.parseInt(size, 10)
    this.type = type.join(' ')
  }

  isDirectory() {
    return this.type.includes('Directory')
  }

  isFile() {
    return this.type.includes('Regular File')
  }

  get mtimeMs() {
    return this.mtime
  }

  get size() {
    return this.bytes
  }
}

class HelperFileStats implements FileStats {
  constructor(private readonly info: HelperStatInfo) { }

  isDirectory() {
    return this.info.isDir
  }

  isFile() {
    return this.info.isFile
  }

  get mtimeMs() {
    return this.info.mtimeMs
  }

  get size() {
    return this.info.size
  }
}

/**
 * Runs the operation through `typora-helper` when it is available, and falls
 * back to the shell path when it is not.
 *
 * Only `HelperUnavailableError` triggers the fallback: an operation-level error
 * (`ENOENT`, `EACCES`, ...) is a real answer and must reach the caller
 * unchanged, otherwise a failed helper call would turn into an approval dialog
 * and then the same error.
 */
async function viaHelper<T>(
  op: string,
  args: Record<string, unknown>,
  fallback: () => Promise<T>,
  timeoutMs?: number,
): Promise<T> {
  if (!macHelper.isEnabled()) return fallback()

  try {
    return await macHelper.request<T>(op, args, timeoutMs)
  }
  catch (error) {
    if (error instanceof HelperUnavailableError) return fallback()
    throw error
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
    // `exists()` runs on hot paths (startup, `access()`, config reads). Gate on
    // `ready` rather than `isEnabled()` so an existence check never spawns the
    // helper, i.e. never pops the approval dialog by itself.
    if (macHelper.ready) {
      try {
        const info = await macHelper.request<HelperStatInfo>('stat', { path: filepath })
        return info.exists
      }
      catch (error) {
        if (!(error instanceof HelperUnavailableError)) throw error
      }
    }

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

  async stat(filepath: string): Promise<FileStats> {
    if (macHelper.isEnabled()) {
      try {
        const info = await macHelper.request<HelperStatInfo>('stat', { path: filepath })
        if (!info.exists) {
          throw new Error(`ENOENT: no such file or directory, stat '${filepath}'`)
        }
        return new HelperFileStats(info)
      }
      catch (error) {
        if (!(error instanceof HelperUnavailableError)) throw error
      }
    }

    // macOS uses BSD stat: `Modify:`/`Size:` labels are GNU-only. Force the
    // C locale so `%HT` (file type) stays English and parse the fields we ask
    // for instead of the platform's default output.
    const out = await Shell.run(`LC_ALL=C stat -f '%m %z %HT' ${Shell.escape(filepath)}`) as string
    return new MacFileStats(out)
  }

  isDirectory(filepath: string): Promise<boolean> {
    return new Promise(resolve =>
      bridge.callHandler('path.isDirectory', filepath, resolve))
  }

  mkdir(dirpath: string): Promise<void> {
    return viaHelper('mkdir', { path: dirpath },
      () => Shell.run(`mkdir -p ${Shell.escape(dirpath)}`) as Promise<void>)
  }

  copy(src: string, dest: string): Promise<void> {
    return viaHelper('copy', { src, dest }, () => this._copyByBridgeOrShell(src, dest), 30_000)
  }

  move(src: string, dest: string): Promise<void> {
    return viaHelper('move', { src, dest }, () => this._moveByBridgeOrShell(src, dest), 30_000)
  }

  private async _copyByBridgeOrShell(src: string, dest: string): Promise<void> {
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

  private async _moveByBridgeOrShell(src: string, dest: string): Promise<void> {
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
    return viaHelper<string[] | HelperListInfo>('list', { path: dirpath }, () =>
      Shell.run(`ls ${Shell.escape(dirpath)}`)
        .then((out: string) => {
          const text = String(out ?? '').trim()
          return text ? text.split(/\r?\n/) : []
        }),
    ).then(toNames)
  }

  async listDirs(dirpath: string): Promise<string[]> {
    const result = await viaHelper<string[] | HelperListInfo>('listDirs', { path: dirpath }, async () => {
      const node = await this._listUnderBridge(dirpath)
      if (!node || !Array.isArray(node.subdir)) {
        return super.listDirs(dirpath)
      }

      return node.subdir
        .filter((entry: any) => typeof entry?.name === 'string')
        .map((entry: any) => entry.name as string)
    })
    return toNames(result)
  }

  /**
   * Recursively list files and mtimes through Typora's file-tree API.
   *
   * Note: `library.listDocsUnder` only returns files Typora shows in the file
   * tree (Markdown documents, and hidden/non-document files according to the
   * user's sidebar settings). Callers that need every file must fall back to
   * `listFiles()` when the tree does not contain a directory.
   */
  async listFilesWithStats(
    dirpath: string,
    options: ListFilesOptions = {},
  ): Promise<FileTreeEntry[] | undefined> {
    const { recursive = false, signal } = options
    const files: FileTreeEntry[] = []

    const walk = async (dir: string): Promise<boolean> => {
      signal?.throwIfAborted()

      const node = await this._listUnderBridge(dir)
      if (!node) return false

      if (recursive && Array.isArray(node.subdir)) {
        for (const subdir of node.subdir) {
          if (typeof subdir?.path !== 'string') continue
          const subdirPath = path.isAbsolute(subdir.path)
            ? subdir.path
            : path.join(dir, subdir.path)
          if (!await walk(subdirPath)) return false
        }
      }

      if (Array.isArray(node.content)) {
        for (const entry of node.content) {
          if (typeof entry?.path !== 'string') continue
          if (entry.isFile === false) continue

          files.push({
            path: path.isAbsolute(entry.path)
              ? entry.path
              : path.join(dir, entry.path),
            mtimeMs: toTimeMs(entry.lastModified),
            // `TFile` does not declare a size, but keep it if a future Typora
            // version provides one.
            size: typeof entry.size === 'number' ? entry.size : undefined,
          })
        }
      }

      return true
    }

    return await walk(dirpath) ? files : undefined
  }

  readText(filepath: string): Promise<string> {
    return Promise.resolve().then(() => this.readTextSync(filepath))
  }

  readTextSync(filepath: string): string {
    return bridge.callSync('path.readText', filepath)
  }

  writeText(filepath: string, text: string): Promise<void> {
    // The shell version writes `printf '%s\n'`, i.e. text plus one newline.
    // Keep the bytes identical so config files do not change shape.
    return viaHelper('writeText', { path: filepath, text: `${text}\n` },
      () => Shell.run(`printf '%s\\n' ${Shell.escape(text)} > ${Shell.escape(filepath)}`) as Promise<void>,
      30_000)
  }

  appendText(filepath: string, text: string): Promise<void> {
    return viaHelper('appendText', { path: filepath, text },
      () => Shell.run(`printf '%s' ${Shell.escape(text)} >> ${Shell.escape(filepath)}`) as Promise<void>,
      30_000)
  }

  remove(filepath: string): Promise<void> {
    return viaHelper('remove', { path: filepath },
      () => this._removeByBridgeOrShell(filepath),
      30_000)
  }

  private async _removeByBridgeOrShell(filepath: string): Promise<void> {
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
   * Read a directory node through Typora's file-tree API.
   *
   * `library.listDocsUnder` is the only non-shell directory listing available
   * on macOS. Returns `undefined` when the handler is unavailable or fails, so
   * callers can fall back to shell commands.
   */
  private _listUnderBridge(dirpath: string): Promise<any | undefined> {
    return new Promise(resolve => {
      let settled = false
      let timer: ReturnType<typeof setTimeout> | undefined

      const finish = (value: any | undefined) => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        resolve(value)
      }

      timer = setTimeout(() => finish(undefined), 5_000)

      try {
        bridge.callHandler('library.listDocsUnder', dirpath, (file: any) => {
          if (!file || typeof file !== 'object' || typeof file.name !== 'string') {
            finish(undefined)
            return
          }

          finish(file)
        })
      }
      catch {
        finish(undefined)
      }
    })
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
