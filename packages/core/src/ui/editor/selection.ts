import { editor, type Rangy } from "typora"
import { useEventBus } from "src/common/eventbus"
import { isCodeEditor } from "./code-editor"


export class EditorSelection {

  private selected: Rangy | null = null

  constructor(
    markdownEditor = useEventBus('markdown-editor')
  ) {
    markdownEditor.on('edit', () => {
      this.selected = null
    })

    // Keep track of the last selection made inside the editor. Commands that
    // insert content asynchronously (after focus moved to an input or modal)
    // can then restore the anchor instead of pasting at the document start.
    document.addEventListener('selectionchange', () => {
      if (!this._isInEditor() || isCodeEditor(document.activeElement))
        return

      const range = editor.selection.getRangy()
      if (range)
        this.selected = range
    })
  }

  save() {
    this.selected = editor.selection.getRangy()
  }

  restore() {
    this.selected?.select()
  }

  /**
   * Whether the focus is currently inside the editor's writing area.
   */
  private _isInEditor(): boolean {
    const active = document.activeElement
    if (!active || active === document.body) return false
    return !!editor.writingArea?.contains(active)
  }

  /**
   * Restore the anchor before inserting content.
   *
   * Typora ignores paste events while an input or `body` has focus, so this
   * re-focuses the writing area and re-applies the last selection captured
   * inside the editor.
   *
   * @param at - `"selection"` keeps the selected range; `"cursor"` collapses
   * it to the caret.
   */
  restoreForInsertion(at: 'selection' | 'cursor' = 'selection') {
    const writingArea = editor.writingArea
    if (!writingArea) return

    const range = this._getInsertionRange()

    writingArea.focus()

    if (range) {
      if (at === 'cursor')
        range.collapse(!!range.isBackward)
      range.select()
      return
    }

    if (at === 'cursor') {
      const selection = window.getSelection()
      if (selection && !selection.isCollapsed)
        selection.collapseToEnd()
    }
  }

  /**
   * Selection that an insertion should target.
   *
   * Uses the live selection while the editor has focus; otherwise falls back
   * to the last selection captured inside the editor.
   */
  private _getInsertionRange(): Rangy | null {
    if (this._isInEditor())
      return editor.selection.getRangy()

    if (this.selected)
      return this.selected

    // The saved selection is cleared on edits, but the browser may still keep
    // the last selection inside the writing area. Use it rather than inserting
    // at an unanchored position.
    const live = editor.selection.getRangy()
    return isRangeInEditor(live) ? live : null
  }

  /**
   * Get cursor position as text offset from the start of #write's text content.
   * Returns null if cursor is outside #write or no selection exists.
   */
  getCursor(): number | null {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return null

    const container = editor.writingArea
    const focusNode = sel.focusNode
    const focusOffset = sel.focusOffset
    if (!container || !focusNode) return null

    // Cursor may be outside #write (CodeMirror code fences, search bar, menu…)
    if (!container.contains(focusNode)) return null

    // Compute character offset from the start of #write's text content
    // (Typora's restoreEdge approach — DOM-structure-independent)
    const treeWalker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
    )
    let textOffset = 0
    let node: Node | null
    while (node = treeWalker.nextNode()) {
      if (node === focusNode) {
        textOffset += focusOffset
        return textOffset
      }
      textOffset += node.textContent?.length ?? 0
    }

    return textOffset
  }

  /**
   * Set cursor position to the given text offset from the start of #write's text content.
   */
  setCursor(offset: number): void {
    const container = editor.writingArea

    // restoreEdge-style traversal: walk text nodes, accumulate lengths,
    // find the text node containing the target offset
    const treeWalker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
    )
    let accumulated = 0
    let textNode: Node | null
    let found = false

    while (textNode = treeWalker.nextNode()) {
      const len = textNode.textContent?.length ?? 0

      if (accumulated + len >= offset) {
        // Offset falls within this text node
        const nodeOffset = offset - accumulated

        const range = document.createRange()
        range.setStart(textNode, nodeOffset)
        range.collapse(true)

        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
        found = true
        break
      }
      accumulated += len
    }

    if (!found) {
      // targetOffset at or past the end of all text — cursor at end of container
      const range = document.createRange()
      range.selectNodeContents(container)
      range.collapse(false)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

}


function isRangeInEditor(range: Rangy | null): range is Rangy {
  const container = range?.commonAncestorContainer
  return !!container && !!editor.writingArea?.contains(container)
}
