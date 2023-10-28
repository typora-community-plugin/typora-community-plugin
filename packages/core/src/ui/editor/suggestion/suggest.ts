import './suggest.scss'
import { type TRange, editor } from 'typora'


export abstract class EditorSuggest<T> {

  /**
   * User's input text prefix which will trigger this suggest.
   *
   * @example ":" // prefix `:` for emoji (like `:smile:`)
   */
  abstract triggerText: string

  abstract suggestions: T[]

  private _placeholder: string[] = []

  get isUsing() {
    return editor.autoComplete.state.all === this._placeholder
  }

  private _handlers = {
    search: this.getSuggestions.bind(this),
    render: this._renderSuggestion.bind(this),
    beforeApply: this.beforeApply.bind(this),
  } as const

  show(range: TRange, query: string) {
    editor.autoComplete.show(this._placeholder, range, query, this._handlers)
  }

  abstract findQuery(text: string): { isMatched: boolean, query?: string }

  abstract getSuggestions(query: string): NonNullable<T>[]

  /**
   * @returns HTML string
   */
  _renderSuggestion(suggest: NonNullable<T>, isActive: boolean): string {
    const className = `typ-suggestion ${isActive ? "active" : ""}`
    const text = this.renderSuggestion(suggest)
      .replace(/[']/g, "&quot;")
    return `<li class="${className}" data-content="${text}">${text}</li>`
  }

  /**
   * @returns HTML string
   */
  renderSuggestion(suggest: NonNullable<T>): string {
    return suggest.toString()
  }

  /**
   * @returns Markdown string
   */
  abstract beforeApply(suggest: NonNullable<T>): string
}
