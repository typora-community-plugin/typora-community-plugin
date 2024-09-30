
const ESCAPE_CHAR = '\\'

export abstract class StringMask {

  protected _cache: string[] = []

  constructor() { }

  abstract mask(s: string): string
  abstract unmask(s: string): string

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
  constructor(private regexp: RegExp, private placeholder: string) {
    super()
  }

  mask(s: string) {
    return s.replace(this.regexp, ($, ...args) => {
      const offset = args.at(-2)
      if (s[offset - 1] === ESCAPE_CHAR) return $
      this._cache.push($)
      return this.placeholder
    })
  }

  unmask(s: string) {
    this._cache.reverse()
    return s.replace(new RegExp(this.placeholder, 'g'), ($) => {
      return this._cache.pop()!
    })
  }
}
