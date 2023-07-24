import * as _ from "lodash"
import type { App } from "src/app"
import { Events } from "src/events"
import until from "src/utils/until"
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

  constructor(app: App) {
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
  }

}
