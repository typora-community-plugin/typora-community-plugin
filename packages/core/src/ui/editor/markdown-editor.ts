import decorate from "@plylrnsdy/decorate.js"
import { editor } from "typora"
import { Component } from "src/common/component"
import { useService } from "src/common/service"
import { Events } from "src/common/events"
import { MarkdownPostProcessor } from "./postprocessor/postprocessor-manager"
import { MarkdownPreProcessor } from "./preprocessor/preprocessor"
import { EditorSelection } from "./selection"
import { EditorSuggestManager } from "./suggestion/suggest-manager"
import { debounce } from "src/utils"
import type { FileURL } from "src/utils/types"
import { until } from "src/utils"


export type MarkdownEditorEvents = {
  'load'(editorEl: HTMLElement): void
  'edit'(): void
  'scroll'(): void
}


export class MarkdownEditor extends Events<MarkdownEditorEvents> {

  preProcessor = new MarkdownPreProcessor()

  postProcessor = new MarkdownPostProcessor()

  selection = new EditorSelection()

  suggestion = new EditorSuggestManager()

  private _openLinkInCurrentWin: OpenLinkInCurrentWin

  constructor() {
    super('markdown-editor')

    setTimeout(() => {
      this._openLinkInCurrentWin = new OpenLinkInCurrentWin()
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
      setTimeout(() => editor.tryOpenUrl(url.hash), 500)
    }
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

class OpenLinkInCurrentWin extends Component {

  constructor(
    settings = useService('settings')
  ) {
    super()

    const SETTING_KEY = 'openLinkInCurrentWin'

    if (settings.get(SETTING_KEY)) {
      this.load()
    }

    settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  onload() {
    const tryOpenUrl = editor.tryOpenUrl_ ? 'tryOpenUrl_' : 'tryOpenUrl'

    this.register(
      decorate(editor, tryOpenUrl, fn => (url, param1) => {

        // handle: file path
        if (!(url.startsWith('#') || url.startsWith('http'))) {
          useService('app').openFile(decodeURIComponent(url))
          return
        }

        // handle: only anchor `#anchor`
        // handle: http url
        return fn(url, param1)
      }))
  }

}
