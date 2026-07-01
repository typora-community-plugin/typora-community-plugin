import { editor, type Rangy } from "typora"
import { useEventBus } from "src/common/eventbus"


export class EditorSelection {

  private selected: Rangy | null

  constructor(
    markdownEditor = useEventBus('markdown-editor')
  ) {
    markdownEditor.on('edit', () => {
      this.selected = null
    })
  }

  save() {
    this.selected = editor.selection.getRangy()
  }

  restore() {
    this.selected?.select()
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
