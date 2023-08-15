import * as _ from "lodash"
import type { App } from "src/app"
import { Events } from "src/events"
import { until } from "src/utils/until"
import type { FileURL } from "src/utils/types"
import { editor } from "typora"
import { MarkdownPostProcessor } from "./postprocessor"
import { MarkdownPreProcessor } from "./preprocessor"
import { EditorSelection } from "./selection"
import { EditorSuggestManager } from "./editor-suggestion"
import decorate from "@plylrnsdy/decorate.js"
import { Component } from "src/component"


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

      decorate.afterCall(editor.wordCount, 'quickUpdate',
        _.debounce(() => this.emit('edit'), 200)
      )

      // <content>
      el.parentElement!.addEventListener('scroll',
        _.debounce(() => this.emit('scroll'), 200)
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
      setTimeout(() => this.jumpToAnchor(url.hash), 500)
    }
  }

  private $anchorHelper = $(`<a class="typ-anchor-helper" href="" style="display: none;">`)
    .appendTo(document.body)

  private jumpToAnchor(anchor: string) {
    const tocItem = $(`#outline-content .outline-label:contains("${anchor.slice(1)}")`).get(0)

    if (tocItem)
      tocItem.click()
    else
      this.$anchorHelper.attr('href', anchor).get(0).click()
  }

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
    this.register(
      decorate(editor, 'tryOpenLink', fn => ($a, param1) => {
        if (
          $a.get(0).matches('a') &&
          !$a.attr('href').startsWith('http')
        ) {
          this.app.openFile(unescape($a.attr('href')))
          return
        }

        return fn($a, param1)
      }))
  }

  onunload() {
  }

}
