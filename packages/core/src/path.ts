import { File, reqnode } from 'typora'


interface IPath {
  readonly sep: string

  isAbsolute(path: string): boolean

  basename(filepath: string, suffix?: string): string
  extname(filepath: string): string
  dirname(filepath: string): string

  join(...paths: string[]): string

  // resolve(from: string, ...to: string[]): string
  relative(from: string, to: string): string
}

class BrowserPath implements IPath {

  readonly sep = File.isWin ? '\\' : '/'

  isAbsolute(path: string): boolean {
    return path.startsWith('/')
  }

  basename(filepath: string, suffix?: string): string {
    const segments = filepath.split(/[\\\/]+/)
    if (!segments[segments.length - 1]) segments.pop()
    const base = segments.pop()
    return suffix ? base.slice(0, -1 * suffix.length) : base
  }

  extname(filepath: string): string {
    const base = this.basename(filepath)
    if (!base) return ''
    // Match Node.js behavior: extension starts from the last '.',
    // but a leading '.' on a dotfile (e.g. '.gitignore') is NOT an extension
    const idx = base.lastIndexOf('.')
    if (idx <= 0) return '' // no dot, or dot only at position 0
    return base.slice(idx)
  }

  dirname(filepath: string): string {
    const segments = filepath.split(/[\\\/]+/)
    if (!segments[segments.length - 1]) segments.pop()
    const result = segments.slice(0, -1).join(this.sep)
    // Root directory: dirname('/') should return '/' (not '')
    return result || this.sep
  }

  join(...paths: string[]): string {
    if (!paths.length) return '.'

    const segments = paths
      .map(path => path.trim().replace(/[\\\/]+$/, ''))
      .flatMap(path => path.split(/[\\\/]+/))
    const res = []

    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      if ('.' === s) continue
      if ('..' === s) { res.pop(); continue }
      res.push(s)
    }

    return res.join(this.sep)
  }

  relative(from: string, to: string): string {
    if (from === to) return ''

    const segments1 = from.trim().split(/[\\\/]+/).filter(Boolean)
    const segments2 = to.trim().split(/[\\\/]+/).filter(Boolean)
    const len = Math.max(segments1.length, segments2.length)
    const res = []

    for (let i = 0; i < len; i++) {
      const s1 = segments1[i]
      const s2 = segments2[i]
      if (s1 === s2) continue
      // Only push '..' when we still have a current directory to exit
      if (s1 != null && s2 != null) res.push('..')
      else if (s1 == null && s2 != null) {
        // 'from' is an ancestor of 'to', no more '..' needed
        break
      }
      if (s2 != null) res.push(s2)
    }

    return res.join(this.sep)
  }
}

const path: IPath = File.isNode
  ? reqnode('path') as typeof import('path')
  : new BrowserPath()

export default path
