import { Events } from "src/common/events"
import { debounce, until } from "src/utils"
import type { FileURL } from "src/utils/types"
import { editor, File } from "typora"
import { InternalContextMenu } from "../components/menu"
import { isCodeEditor } from "./code-editor"
import { Codeblock } from "./codeblock"
import { MarkdownLinkWitoutExtension, OpenLinkInCurrentWin } from "./link"
import { blockMarkdownViewPreviewMode } from "./postprocessor/codeblock-postprocessor"
import { bindPostProcessorToEditor, MarkdownPostProcessor } from "./postprocessor/postprocessor-manager"
import { bindPreProcessorToEditor, MarkdownPreProcessor } from "./preprocessor/preprocessor"
import { EditorSelection } from "./selection"
import { EditorSuggestManager } from "./suggestion/suggest-manager"


export type MarkdownEditorEvents = {
  'load'(editorEl: HTMLElement): void
  'edit'(): void
  'scroll'(): void
  'contextmenu'(params: { menu: InternalContextMenu }): void
}


export class MarkdownEditor extends Events<MarkdownEditorEvents> {

  preProcessor = new MarkdownPreProcessor()

  postProcessor = new MarkdownPostProcessor()

  selection = new EditorSelection()

  suggestion = new EditorSuggestManager()

  codeblock = new Codeblock()

  private _contextmenu = new InternalContextMenu('#context-menu')
  private _isContextMenuReady = false
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: the constructor of this component registers its behavior; the field is never read on purpose
  private _openLinkInCurrentWin!: OpenLinkInCurrentWin
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: the constructor of this component registers its behavior; the field is never read on purpose
  private _markdownLinkWitoutExtension!: MarkdownLinkWitoutExtension

  constructor() {
    super('markdown-editor')

    bindPreProcessorToEditor(this)
    bindPostProcessorToEditor(this)
    blockMarkdownViewPreviewMode()

    setTimeout(() => {
      this._openLinkInCurrentWin = new OpenLinkInCurrentWin()
      this._markdownLinkWitoutExtension = new MarkdownLinkWitoutExtension()
    })

    until(() => editor.writingArea).then(el => {
      this.emit('load', el)

      const observer = new MutationObserver(debounce(emitEdit.bind(this), 400))
      observer.observe(el, {
        characterData: true,
        childList: true,
        subtree: true,
      })

      // <content>
      el.parentElement!.addEventListener('scroll',
        debounce(() => this.emit('scroll'), 200)
      )
    })
  }

  openFile(file: string | FileURL) {
    const url = typeof file === 'string'
      ? { pathname: file }
      : file

    editor.library.openFile(url.pathname)

    if (url.hash) {
      setTimeout(() => editor.tryOpenUrl(url.hash!), 500)
    }
  }

  getMarkdown(): string {
    return editor.getMarkdown()
  }

  setMarkdown(markdown: string) {
    File.reloadContent(markdown, false, true, false, true)
  }

  /**
   * Insert Markdown at the current selection or cursor.
   *
   * A stable alternative to calling Typora's internal `UserOp.pasteHandler()`
   * directly.
   *
   * @param markdown Markdown source to insert.
   * @param at
   * - `"selection"` (default): replace the current selection. If nothing is
   *   selected, insert at the cursor.
   * - `"cursor"`: insert at the cursor, discarding any selected range.
   */
  insertMarkdown(markdown: string, at: 'selection' | 'cursor' = 'selection') {
    if (!editor.writingArea) return

    // Keep editing inside a code fence or source view: the native paste
    // handler writes to CodeMirror there.
    if (!isCodeEditor(document.activeElement))
      this.selection.restoreForInsertion(at)

    editor.UserOp.pasteHandler(editor, markdown, true)
  }

  _onContextMenu(callback: MarkdownEditorEvents['contextmenu']) {
    $(editor.writingArea).on('mousedown', event => {
      if (event.button !== 2) return

      this._contextmenu.removeExtendedMenuItem()

      // Typora builds some native menu groups lazily on the first open (e.g.
      // the search group), inside the `contextmenu` handler that runs after
      // this `mousedown` handler. Wait until the menu is shown before invoking
      // plugins, otherwise they cannot find those groups via `insertItemAfter`.
      if (this._isContextMenuReady || editor.sourceView.inSourceMode) {
        callback({ menu: this._contextmenu })
        return
      }

      until(() => this._contextmenu.containerEl.classList.contains('show'))
        .then(() => {
          this._isContextMenuReady = true
          callback({ menu: this._contextmenu })
        })
    })
  }
}

// Avoid dead loop caused by post-processor.
function emitEdit(this: MarkdownEditor, mutationsList: MutationRecord[]) {
  if (!isEdited(mutationsList)) return
  docNodeCount = editor.nodeMap.allNodes._set.length
  this.emit('edit')
}

let docNodeCount = 0

function isEdited(mutationsList: MutationRecord[]) {
  // change text
  if (mutationsList.some(m => m.type === 'characterData'))
    return true

  const first = mutationsList[0]
  if (
    mutationsList.length === 1 && (
      // add first (remove last) char in a parargraph
      first.addedNodes.length &&
      first.removedNodes.length) || (
      // add math in a parargraph
      matchElement(first.target, '.md-math-tex')
    )
  ) return true

  // change inline text style
  const rest = mutationsList.slice(0, -1)
  const [last] = mutationsList.slice(-1)
  if (
    rest.every(m => matchElement(m.target, 'span') &&
      matchElement(last.target, '.md-focus'))
  ) return true

  // add/remove parargraph
  return docNodeCount !== editor.nodeMap.allNodes._set.length
}

function matchElement(node: Node, selector: string) {
  return isElement(node) && match(node, selector)
}

function isElement(node: Node): node is Element {
  return node.nodeType === 1
}

function match(el: Element, selector: string) {
  if (selector.startsWith('.'))
    return el.classList.contains(selector.slice(1))
  else
    return el.tagName === selector.toUpperCase()
}
