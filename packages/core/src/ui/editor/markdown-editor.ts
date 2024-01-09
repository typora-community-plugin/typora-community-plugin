import decorate from "@plylrnsdy/decorate.js"
import { editor } from "typora"
import type { App } from "src/app"
import { Component } from "src/component"
import { Events } from "src/events"
import { MarkdownPostProcessor } from "./postprocessor/postprocessor-manager"
import { MarkdownPreProcessor } from "./preprocessor/preprocessor"
import { EditorSelection } from "./selection"
import { EditorSuggestManager } from "./suggestion/suggest-manager"
import { debounce } from "src/utils/debounce"
import type { FileURL } from "src/utils/types"
import { until } from "src/utils/until"


type MarkdownEditorEvents = {
  'load'(editorEl: HTMLElement): void
  'edit'(): void
  'scroll'(): void
}

export class MarkdownEditor extends Events<MarkdownEditorEvents> {

  preProcessor = new MarkdownPreProcessor()

  postProcessor: MarkdownPostProcessor

  selection = new EditorSelection(this)

  suggestion = new EditorSuggestManager(this)

  private _openLinkInCurrentWin: OpenLinkInCurrentWin

  constructor(private app: App) {
    super()

    this.postProcessor = new MarkdownPostProcessor(app)

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

    this._openLinkInCurrentWin = new OpenLinkInCurrentWin(app)
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


function emitEdit(this: MarkdownEditor, mutationsList: MutationRecord[]) {
  if (!isEdited(mutationsList)) return
  this.emit('edit')
}

function isEdited(mutationsList: MutationRecord[]) {
  return (
    mutationsList.some(m => m.type === 'characterData')
  ) || (
      mutationsList.length === 1 &&
      mutationsList[0].addedNodes.length &&
      mutationsList[0].removedNodes.length
    )
}

class OpenLinkInCurrentWin extends Component {

  constructor(private app: App) {
    super()

    const SETTING_KEY = 'openLinkInCurrentWin'

    if (app.settings.get(SETTING_KEY)) {
      this.load()
    }

    app.settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  onload() {
    const tryOpenUrl = editor.tryOpenUrl_ ? 'tryOpenUrl_' : 'tryOpenUrl'

    this.register(
      decorate(editor, tryOpenUrl, fn => (url, param1) => {

        if (!(url.startsWith('#') || url.startsWith('http'))) {
          this.app.openFile(unescape(url))
          return
        }

        return fn(url, param1)
      }))
  }

}
