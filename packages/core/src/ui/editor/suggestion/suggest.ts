import './suggest.scss'
import { type TRange, editor } from 'typora'


/**
 * **Execution Flow**
 *
 * `suggest.canTrigger()`
 *
 * → `suggest.findQuery()`
 *
 * → `suggest.lengthOfTextBeforeToBeReplaced()`
 *
 * → `suggest.show()` → typora.autoComplete #serach()
 *
 * → `suggest.getSuggestions()` → typora.autoComplete #render()
 *
 * → `suggest.renderSuggestion()` → User picks an item
 *
 * → `suggest.beforeApply()` → typora.autoComplete #apply()
 */
export abstract class EditorSuggest<T> {

  /**
   * User's input text prefix which will trigger this suggest.
   *
   * @example ":" // prefix `:` for emoji (like `:smile:`)
   */
  abstract triggerText: string

  private _placeholder: string[] = []

  get isUsing() {
    return editor.autoComplete.state.all === this._placeholder
  }

  private _handlers = {
    search: this.getSuggestions.bind(this),
    render: this._renderSuggestion.bind(this),
  } as const

  canTrigger(textBefore: string, textAfter: string, range: TRange) {
    return !!textBefore
  }

  show(range: TRange, query: string) {
    editor.autoComplete.show(this._placeholder, range, query, this._handlers)
  }

  hide() {
    editor.autoComplete.hide()
  }

  abstract findQuery(textBefore: string, textAfter: string, range: TRange): { isMatched: boolean, query?: string }

  abstract getSuggestions(query: string): NonNullable<T>[]

  abstract getSuggestionId(suggest: NonNullable<T>): string

  /**
   * @returns HTML string
   */
  _renderSuggestion(suggest: NonNullable<T>, isActive: boolean): string {
    const className = `typ-suggestion ${isActive ? "active" : ""}`
    const id = this.getSuggestionId(suggest)
    const text = this.renderSuggestion(suggest)
    return `<li class="${className}" data-content="${id}">${text}</li>`
  }

  /**
   * @returns HTML string
   */
  renderSuggestion(suggest: NonNullable<T>): string {
    return suggest.toString()
  }

  abstract getSuggestionById(id: string): NonNullable<T>

  _beforeApply(matched: any) {
    if (typeof matched === 'string')
      // select item by click
      return this.beforeApply(this.getSuggestionById(matched))
    else
      // select item by enter
      return this.beforeApply(matched)
  }

  /**
   * @returns Markdown string
   */
  abstract beforeApply(suggest: NonNullable<T>): string

  lengthOfTextBeforeToBeReplaced(query: string) {
    return query.length + this.triggerText.length
  }
}
