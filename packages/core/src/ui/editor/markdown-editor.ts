import * as _ from "lodash"
import type { App } from "src/app"
import { Events } from "src/events"
import { until } from "src/utils/until"
import type { DisposeFunc, FileURL } from "src/utils/types"
import { editor } from "typora"
import { MarkdownPostProcessor } from "./postprocessor"
import { MarkdownPreProcessor } from "./preprocessor"
import { EditorSelection } from "./selection"
import { EditorSuggestManager } from "./editor-suggestion"
import decorate from "@plylrnsdy/decorate.js"


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

    this.enableOpenLinkInWin()

    app.settings.onChange('openLinkInCurrentWin', (_, isEnabled) => {
      isEnabled
        ? this.enableOpenLinkInWin()
        : this.disableOpenLinkInWin()
    })
  }

  private enableOpenLinkInWin() {
    this.disableOpenLinkInWin =
      decorate(editor, 'tryOpenLink', fn => ($a, param1) => {
        if (
          $a.get(0).matches('a') &&
          !$a.attr('href').startsWith('http')
        ) {
          this.app.openFile(unescape($a.attr('href')))
          return
        }

        return fn($a, param1)
      })
  }

  private disableOpenLinkInWin: DisposeFunc = _.noop

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
