import { editor } from 'typora'
import decorate from '@plylrnsdy/decorate.js'
import { EditorSuggest } from './suggest'
import type { DisposeFunc } from "src/utils/types"
import { useEventBus } from 'src/common/eventbus'


export class EditorSuggestManager {

  private _currentSuggest?: EditorSuggest<any>
  private _suggests: EditorSuggest<any>[] = []

  constructor(
    markdownEditor = useEventBus('markdown-editor')
  ) {

    markdownEditor.on('edit', this._onEdit.bind(this))

    decorate.beforeCall(editor.autoComplete, 'show', ([match]) => {
      if (editor.autoComplete.state.all !== match)
        editor.autoComplete.initState()
    })

    decorate(editor.autoComplete, 'apply', fn => (text) => {
      if (this._currentSuggest?.isUsing) {
        const range = editor.selection.getRangy()
        const { anchor } = editor.autoComplete.state
        const textNode = anchor.containerNode.firstChild! as Element
        range.setStart(textNode, anchor.start)
        range.setEnd(textNode, anchor.end)
        editor.selection.setRange(range, true)
        editor.UserOp.pasteHandler(editor, this._currentSuggest!._beforeApply(text), true)
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

    const [textBefore, textAfter, range] = editor.selection.getTextAround()
    if (!range) return

    for (const suggest of this._suggests) {
      if (!suggest.canTrigger(textBefore, textAfter, range)) continue

      this._currentSuggest = suggest
      const { isMatched, query = '' } = suggest.findQuery(textBefore, textAfter, range)
      if (!isMatched) continue

      range.start -= suggest.lengthOfTextBeforeToBeReplaced(query)
      suggest.show(range, query)
      break
    }
  }
}
