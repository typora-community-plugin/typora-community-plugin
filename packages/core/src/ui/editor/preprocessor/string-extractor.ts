
const ESCAPE_CHAR = '\\'

/**
 * @private
 */
export class StringExtractor {

  protected _cache: string[] = []

  /**
   * @param regexp First character include `.` for matching excape character `\`.
   * @param placeholder
   */
  constructor(private regexp: RegExp, private placeholder: string) {
  }

  extract(s: string) {
    return s.replace(this.regexp, ($, ...args) => {
      const offset = args.at(-2)
      if (s[offset - 1] === ESCAPE_CHAR) return $
      this._cache.push($)
      return this.placeholder
    })
  }

  process(processor: (s: string) => string) {
    this._cache = this._cache.map(s => processor(s))
  }

  rebuild(s: string) {
    this._cache.reverse()
    return s.replace(new RegExp(this.placeholder, 'g'), ($) => {
      return this._cache.pop()!
    })
  }

  reset() {
    this._cache = []
  }
}
