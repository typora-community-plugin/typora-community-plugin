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
    return s.replace(this.regexp, ($) => {
      if ($[0] === '\\') return $

      this._cache.push($.slice(1))
      return $[0] + this.placeholder
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
