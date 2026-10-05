import { editor } from 'typora'
import { HtmlPostProcessor } from './html-postprocessor'
import type { PostProcessorContext } from './postprocessor'


export interface DecoratedTextMatch {
  /** RegExp with global flag */
  regexp: RegExp
  /** CSS class name to apply on matched <span> */
  classname: string
  /** Called when the matched <span> is clicked. */
  onClick?: (event: MouseEvent, highlightedEl: HTMLElement) => void
}

interface DecoratedTextPostprocessorOptions {
  matches?: DecoratedTextMatch[]
  selector?: string
}


export class DecoratedTextPostprocessor extends HtmlPostProcessor {

  private _matches: DecoratedTextMatch[] = []

  private _textSelector = '.md-end-block .md-plain'

  private _clickContainers = new WeakSet<HTMLElement>()

  get matches() {
    return this._matches
  }

  set matches(value: DecoratedTextMatch[]) {
    this._matches = value
  }

  get selector() {
    return this._textSelector
  }

  set selector(value: string) {
    this._textSelector = value
  }

  process(textEl: HTMLElement, context: PostProcessorContext) {
    this._bindClick(context.containerEl)

    // `markRange` replaces the text node, which makes the browser move the
    // native caret (usually to the start of the current paragraph). Save the
    // caret as a text offset and restore it after mutating the DOM.
    const writingArea = editor.writingArea
    const selection = window.getSelection()
    const shouldRestoreCaret =
      !!writingArea && !!selection && selection.isCollapsed &&
      !!selection.focusNode && textEl.contains(selection.focusNode)
    const caretOffset = shouldRestoreCaret
      ? getCaretTextOffset(writingArea)
      : null

    let hasMarked = false
    textEl.childNodes.forEach(node => {
      // Use literal `3` instead of `Node.TEXT_NODE`: Typora overrides the global `Node`.
      if (node.nodeType !== /* Node.TEXT_NODE */3 || !node.textContent) return

      const positions = getAllMatchPositions(node.textContent, this.matches)

      for (const pos of positions) {
        const range = editor.selection.rangy.createRange()
        range.moveToBookmark({
          containerNode: node,
          start: pos.start,
          end: pos.end,
        })
        editor.EditHelper.markRange(range, pos.classname)
        hasMarked = true
      }
    })

    if (hasMarked && caretOffset !== null)
      setCaretTextOffset(writingArea, caretOffset)
  }

  private _bindClick(containerEl: HTMLElement) {
    if (this._clickContainers.has(containerEl)) return
    this._clickContainers.add(containerEl)

    containerEl.addEventListener('click', event => {
      const target = event.target as HTMLElement | null
      if (!target || typeof target.closest !== 'function') return

      for (const { classname, onClick } of this._matches) {
        if (!onClick) continue

        const el = target.closest<HTMLElement>(`.${classname}`)
        if (el) {
          onClick(event, el)
          return
        }
      }
    })
  }

  static from(options: DecoratedTextPostprocessorOptions = {}) {
    const processor = new DecoratedTextPostprocessor()
    processor.matches = options.matches || []
    if (options.selector) {
      processor.selector = options.selector
    }
    return processor
  }
}


function getAllMatchPositions(
  str: string,
  matches: DecoratedTextMatch[],
): { classname: string, start: number, end: number }[] {
  const result: { classname: string, start: number, end: number }[] = []

  for (const { regexp, classname } of matches) {
    let match: RegExpExecArray | null
    regexp.lastIndex = 0

    while ((match = regexp.exec(str)) !== null) {
      const start = match.index + (match[1]?.length ?? 0)
      const end = match.index + match[0].length

      if (start >= end) continue

      result.push({ start, end, classname })

      if (!regexp.global) break
    }
  }

  return result.sort((a, b) => b.start - a.start)
}


// `NodeFilter.SHOW_TEXT`, written as a literal because Typora overrides some
// DOM globals (e.g. `Node`).
const SHOW_TEXT = 4


/**
 * Get the collapsed caret position as a text offset from the start of `container`.
 * Returns `null` when the caret is outside `container`.
 */
function getCaretTextOffset(container: HTMLElement): number | null {
  const selection = window.getSelection()
  if (!selection || !selection.focusNode) return null

  const walker = document.createTreeWalker(container, SHOW_TEXT, null)
  let offset = 0
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node === selection.focusNode)
      return offset + selection.focusOffset
    offset += node.textContent?.length ?? 0
  }
  return null
}

/**
 * Restore the collapsed caret to a text offset from the start of `container`.
 */
function setCaretTextOffset(container: HTMLElement, offset: number): void {
  const walker = document.createTreeWalker(container, SHOW_TEXT, null)
  let accumulated = 0
  let node: Node | null
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0
    if (accumulated + length >= offset) {
      const range = document.createRange()
      range.setStart(node, offset - accumulated)
      range.collapse(true)

      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      return
    }
    accumulated += length
  }
}
