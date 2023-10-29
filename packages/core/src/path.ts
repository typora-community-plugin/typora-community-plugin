import { File, reqnode } from 'typora'


interface IPath {
  readonly sep: string

  basename(filepath: string): string
  extname(filepath: string): string
  dirname(filepath: string): string

  join(...paths: string[]): string

  // resolve(from: string, ...to: string[]): string
  relative(from: string, to: string): string
}

class CompatiblePath implements IPath {

  readonly sep = File.isWin ? '\\' : '/'

  basename(filepath: string): string {
    const segments = filepath.split(/[\\\/]+/)
    if (!segments[segments.length - 1]) segments.pop()
    return segments.pop()
  }

  extname(filepath: string): string {
    const segments = this.basename(filepath).split(/\b(?=[.])/)
    return segments.length > 1 ? segments.pop() : ''
  }

  dirname(filepath: string): string {
    const segments = filepath.split(/[\\\/]+/)
    if (!segments[segments.length - 1]) segments.pop()
    return segments.slice(0, -1).join(this.sep)
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
      if (s1 != null) res.push('..')
      if (s2 != null) res.push(s2)
    }

    return res.join(this.sep)
  }
}

const path: IPath = File.isNode
  ? reqnode('path') as typeof import('path')
  : new CompatiblePath()

export default path
