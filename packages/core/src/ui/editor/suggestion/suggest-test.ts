import { EditorSuggest } from './suggest'
import { TextSuggest } from './text-suggest'


// Test case 1: using the low-level `EditorSuggest<string>` directly (manual implementation)
export class FooSlashSuggest extends EditorSuggest<string> {
  override triggerText = '/'

  _suggestions: NonNullable<string>[] = []

  canTrigger(textBefore: string, _textAfter: string, _range: object): boolean {
    return !!textBefore.endsWith('/')
  }

  findQuery(textBefore: string, _ts: string, _r: object): { isMatched: boolean; query?: string } {
    const idx = textBefore.lastIndexOf('/')
    if (idx === -1) return { isMatched: false }
    return { isMatched: true, query: textBefore.slice(idx + 1) }
  }

  getSuggestions(query: string): NonNullable<string>[] {
    const suggestions = [
      'foo', 'foobar', 'foolish', 'foot', 'foothold',
    ] as const

    this._suggestions = query
      ? suggestions.filter((n) => n.toLowerCase().includes(query.toLowerCase()))
      : Object.freeze([...suggestions]) as string[]

    return this._suggestions
  }

  getSuggestionId(suggest: NonNullable<string>): string {
    return suggest.replace(/"/g, '&#34;')
  }

  renderSuggestion(suggest: NonNullable<string>): string {
    return String(suggest)
  }

  getSuggestionById(id: string): NonNullable<string> {
    return this._suggestions.find(n => this.getSuggestionId(n) === id) || ''
  }

  beforeApply(suggest: NonNullable<string>): string {
    return ` [FOO]${suggest}`
  }
}


// Test case 2: using the higher-level `TextSuggest` base class (simplified implementation)
export class BarSlashSuggest extends TextSuggest {
  override triggerText = '/'

  suggestions = ['bar', 'barn', 'barcode']

  findQuery(textBefore: string, _ts: string, _range: object): { isMatched: boolean; query?: string } {
    const idx = textBefore.lastIndexOf('/')
    if (idx === -1) return { isMatched: false }
    return { isMatched: true, query: textBefore.slice(idx + 1) }
  }

  beforeApply(suggest: NonNullable<string>): string {
    return ` [BAR]${suggest}`
  }
}
