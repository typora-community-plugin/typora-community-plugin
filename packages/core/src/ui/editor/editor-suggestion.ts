import './editor-suggestion.scss'
import type { DisposeFunc } from "src/utils/types"
import type { MarkdownEditor } from "./markdown-editor"
import { TRange, editor } from 'typora'
import decorate from '@plylrnsdy/decorate.js'


export class EditorSuggestManager {

  private _currentSuggest?: EditorSuggest<any>
  private _suggests: EditorSuggest<any>[] = []

  constructor(mdEditor: MarkdownEditor) {
    mdEditor.on('edit', this._onEdit.bind(this))

    decorate.beforeCall(editor.autoComplete, 'show', ([match]) => {
      if (editor.autoComplete.state.all !== match)
        editor.autoComplete.initState()
    })

    decorate(editor.autoComplete, 'apply', fn => (text) => {
      if (this._currentSuggest.isUsing) {
        const range = editor.selection.getRangy()
        const { anchor } = editor.autoComplete.state
        const textNode = anchor.containerNode.firstChild! as Element
        range.setStart(textNode, anchor.start)
        range.setEnd(textNode, anchor.end)
        editor.selection.setRange(range, true)
        editor.UserOp.pasteHandler(editor, this._currentSuggest!.beforeApply(text), true)
        editor.autoComplete.hide()
        return
      }
      fn(text)
    })
  }

  register(suggest: EditorSuggest<any>): DisposeFunc {
    this._suggests.push(suggest)
    return () => this.unregister(suggest)
  }

  unregister(suggest: EditorSuggest<any>) {
    this._suggests = this._suggests.filter(s => s !== suggest)
  }

  private _onEdit() {
    if (!this._suggests.length) {
      return
    }

    const [textBefore, _, range] = editor.selection.getTextAround()
    if (!textBefore) return

    for (const suggest of this._suggests) {
      this._currentSuggest = suggest
      const { isMatched, query = '' } = suggest.findQuery(textBefore)
      if (!isMatched) continue

      range.start -= query!.length + suggest.triggerText.length
      suggest.show(range, query)
      break
    }
  }
}

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

export abstract class TextSuggest extends EditorSuggest<string> {

  getSuggestions(query: string) {
    if (!query) return this.suggestions

    query = query.toLowerCase()
    const cache: Record<string, number> = {}
    return this.suggestions
      .filter(n => {
        cache[n] = n.toLowerCase().indexOf(query)
        return cache[n] !== -1
      })
      .sort((a, b) => cache[a] - cache[b] || a.length - b.length)
  }
}
