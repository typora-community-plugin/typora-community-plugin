import type { TRange } from "typora"
import { EditorSuggest } from "./suggest"


interface MergedSuggestion<T> {
  id: string
  suggest: EditorSuggest<T>
  suggestion: T
}

export class MergedSuggest<T> extends EditorSuggest<MergedSuggestion<T>> {
  private _suggests: EditorSuggest<T>[] = []
  private _suggestions: MergedSuggestion<T>[] = []

  triggerText = ''

  constructor(triggerText: string) {
    super()
    this.triggerText = triggerText
  }

  add(suggest: EditorSuggest<T>) {
    if (suggest.triggerText !== this.triggerText) {
      throw Error('[MergedSuggest] Can not merge a suggest with a different `triggerText`')
    }
    this._suggests.push(suggest)
  }

  delete(suggest: EditorSuggest<T>) {
    this._suggests = this._suggests.filter(s => s !== suggest)
  }

  canTrigger(textBefore: string, textAfter: string, range: TRange): boolean {
    let canTrigger = false
    this._suggests.forEach(s => {
      const res = s.canTrigger(textBefore, textAfter, range)
      if (res) canTrigger = res
    })
    return canTrigger
  }

  findQuery(textBefore: string, textAfter: string, range: TRange) {
    let isMatched = false
    this._suggests.forEach(s => {
      const res = s.findQuery(textBefore, textAfter, range)
      if (res.isMatched) {
        // @ts-ignore
        s._query = res.query
        isMatched = true
      }
    })
    return { isMatched, query: '[Merged Query] Use `suggest._query` instead.' }
  }

  lengthOfTextBeforeToBeReplaced(query: string) {
    return this._suggests[0].lengthOfTextBeforeToBeReplaced(query)
  }

  getSuggestions(query: string): any[] {
    this._suggestions = []

    this._suggests.forEach((suggest, index) => {
      suggest
        // @ts-ignore
        .getSuggestions(suggest._query)
        .forEach(s => {
          const id = this._generateMergedId(index, suggest.getSuggestionId(s))
          this._suggestions.push({ id, suggest, suggestion: s })
        })
    })

    return this._suggestions
  }

  private _generateMergedId(sourceIndex: number, id: any): string {
    return `merged_${sourceIndex}_${id}`
  }

  getSuggestionId(suggestion: MergedSuggestion<T>): string {
    return suggestion.id
  }

  renderSuggestion(s: MergedSuggestion<T>): string {
    return s.suggest.renderSuggestion(s.suggestion)
  }

  getSuggestionById(id: string): any {
    return this._suggestions.find(s => s.id === id)
  }

  beforeApply(s: MergedSuggestion<T>): string {
    return s.suggest.beforeApply(s.suggestion)
  }
}
