import { editor } from 'typora'
import decorate from '@plylrnsdy/decorate.js'
import { EditorSuggest } from './suggest'
import type { DisposeFunc } from "src/utils/types"
import { useEventBus } from 'src/common/eventbus'
import { MergedSuggest } from './merged-suggest'


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
        const suggest = this._currentSuggest!
        // @ts-ignore `_query` is private
        const start = anchor.start - suggest.lengthOfTextBeforeToBeReplaced(suggest._query)
        const end = anchor.end
        // `containerNode`'s text may be split across several child nodes (e.g.
        // by a `DecoratedTextPostprocessor`), so map the text offsets onto the
        // text nodes that actually contain them instead of assuming a single
        // `firstChild`.
        const startPos = textOffsetToPosition(anchor.containerNode, start)
        const endPos = textOffsetToPosition(anchor.containerNode, end)
        // @ts-ignore rangy accepts text nodes
        range.setStart(startPos.node, startPos.offset)
        // @ts-ignore rangy accepts text nodes
        range.setEnd(endPos.node, endPos.offset)
        editor.selection.setRange(range, true)
        editor.UserOp.pasteHandler(editor, suggest._beforeApply(text), true)
        editor.autoComplete.hide()
        return
      }
      fn(text)
    })
  }

  register(suggest: EditorSuggest<any>): DisposeFunc {
    const sameTriggerSuggest = this._suggests.find(s => s.triggerText === suggest.triggerText)

    if (sameTriggerSuggest) {
      let mergedSuggest: MergedSuggest<any>

      if (sameTriggerSuggest instanceof MergedSuggest) {
        mergedSuggest = sameTriggerSuggest
      }
      else {
        mergedSuggest = new MergedSuggest(suggest.triggerText)
        this.unregister(sameTriggerSuggest)
        this._suggests.push(mergedSuggest)
        mergedSuggest.add(sameTriggerSuggest)
      }
      mergedSuggest.add(suggest)
    }
    else {
      this._suggests.push(suggest)
    }

    return () => this.unregister(suggest)
  }

  unregister(suggest: EditorSuggest<any>) {
    const filtered = this._suggests.filter(s => s !== suggest)
    if (filtered.length < this._suggests.length)
      this._suggests = filtered
    else
      this._suggests.forEach(s => {
        if (s instanceof MergedSuggest)
          s.delete(suggest)
      })
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

      suggest.show(range, query)
      break
    }
  }
}


// `NodeFilter.SHOW_TEXT`, written as a literal because Typora overrides some
// DOM globals (e.g. `Node`).
const SHOW_TEXT = 4


/**
 * Map a character offset in the text content of `container` to the text node
 * that contains it and the offset within that node.
 */
function textOffsetToPosition(
  container: Node,
  offset: number,
): { node: Node, offset: number } {
  if (container.nodeType === /* Node.TEXT_NODE */ 3) {
    const length = container.textContent?.length ?? 0
    return { node: container, offset: Math.min(Math.max(offset, 0), length) }
  }

  const walker = document.createTreeWalker(container, SHOW_TEXT, null)
  let accumulated = 0
  let lastText: Node | null = null

  let node: Node | null
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0
    if (offset <= accumulated + length)
      return { node, offset: Math.max(offset - accumulated, 0) }
    accumulated += length
    lastText = node
  }

  return lastText
    ? { node: lastText, offset: lastText.textContent?.length ?? 0 }
    : { node: container, offset: 0 }
}
