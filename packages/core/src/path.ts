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
    const base = segments.pop() ?? ''
    return (suffix && base.endsWith(suffix))
      ? base.slice(0, -suffix.length)
      : base
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

    // Find the common ancestor segments
    let commonLength = 0
    while (
      commonLength < segments1.length &&
      commonLength < segments2.length &&
      segments1[commonLength] === segments2[commonLength]
    ) {
      commonLength++
    }

    const res: string[] = []

    // Go up for every remaining segment of `from`
    for (let i = commonLength; i < segments1.length; i++) {
      res.push('..')
    }

    // Then descend into the remaining segments of `to`
    for (let i = commonLength; i < segments2.length; i++) {
      res.push(segments2[i])
    }

    return res.join(this.sep)
  }
}

const path: IPath = File.isNode
  ? reqnode('path') as typeof import('path')
  : new BrowserPath()

export default path
