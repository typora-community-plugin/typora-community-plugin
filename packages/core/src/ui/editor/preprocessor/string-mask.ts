
const ESCAPE_CHAR = '\\'

export abstract class StringMask {

  protected _cache: string[] = []

  constructor(protected placeholder: string) { }

  abstract mask(s: string): string

  unmask(s: string) {
    this._cache.reverse()
    return s.replace(new RegExp(this.placeholder, 'g'), ($) => {
      return this._cache.pop()!
    })
  }

  processMasked(processor: (s: string) => string) {
    this._cache = this._cache.map(s => processor(s))
  }

  reset() {
    this._cache = []
  }
}

export class RegexpBasedStringMask extends StringMask {

  /**
   * @param regexp First character include `.` for matching excape character `\`.
   * @param placeholder
   */
  constructor(private regexp: RegExp, placeholder: string) {
    super(placeholder)
  }

  mask(s: string) {
    return s.replace(this.regexp, ($, ...args) => {
      const offset = args.at(-2)
      if (s[offset - 1] === ESCAPE_CHAR) return $
      this._cache.push($)
      return this.placeholder
    })
  }
}

const SELF_CLOSING_TAGS = 'area,base,br,col,command,embed,hr,img,input,keygen,link,meta,param,source,track,wbr'.split(',')

export class HtmlMask extends StringMask {

  constructor(placeholder: string) {
    super(placeholder)
  }

  private findHtmlRanges(md: string) {
    const ranges = []
    const stack = [] as { tagName: string, start: number, end: number }[]
    const regex = /\\?<\/?([a-zA-Z][a-zA-Z-]*)[^>]*?>/g
    let match

    while ((match = regex.exec(md)) !== null) {
      const tag = match[0]

      if (tag.startsWith('\\')) continue

      const tagName = match[1]
      const start = match.index
      const end = start + tag.length - 1

      if (tag[1] !== '/') {
        if (SELF_CLOSING_TAGS.includes(tagName)) {
          if (stack.length === 0)
            ranges.push({ start, end })
        }
        else
          stack.push({ tagName, start, end })
      }
      else {
        const lastTag = stack.pop()
        if (!lastTag) {
          throw new Error(`Tag </${tagName}> is not opened.`)
        }
        if (lastTag.tagName !== tagName) {
          throw new Error(`Tag <${lastTag.tagName}> closes with </${tagName}> incorrectly.`)
        }
        if (stack.length === 0) {
          ranges.push({
            start: lastTag.start,
            end: end,
          })
        }
      }
    }

    if (stack.length > 0) {
      const lastTag = stack.pop();
      throw new Error(`Tag <${lastTag.tagName}> is not closed.`)
    }

    return ranges
  }

  mask(s: string): string {
    const ranges = this.findHtmlRanges(s)
    let start = 0
    let res = ''
    for (const range of ranges) {
      res += s.slice(start, range.start) + this.placeholder
      this._cache.push(s.slice(range.start, range.end + 1))
      start = range.end + 1
    }
    res += s.slice(start, s.length)
    return res
  }
}
