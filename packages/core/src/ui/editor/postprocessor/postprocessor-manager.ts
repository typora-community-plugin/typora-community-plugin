import { editor } from "typora"
import type { App } from "src/app"
import { PostProcessor, type RawProcessor } from './postprocessor'
import { HtmlPostProcessor } from './html-postprocessor'
import { CodeblockPostProcessor } from './codeblock-postprocessor'
import type { DisposeFunc } from "src/utils/types"


export type TPostProcessor = RawProcessor | PostProcessor | HtmlPostProcessor | CodeblockPostProcessor

export class MarkdownPostProcessor {

  private _processors: HtmlPostProcessor[] = []
  private _codePreviewProcessors: Record<string, CodeblockPostProcessor> = {}

  constructor(private app: App) {
    setTimeout(() => this._registerProcessors())
  }

  private _registerProcessors() {
    const listener = () => this._process(this._processors)

    const codeblockListener = () =>
      this._process(
        this._processors.filter(p =>
          'type' in p && p.type === 'codeblock'
        ))

    this.app.workspace.on('file:open', listener)
    this.app.workspace.activeEditor.on('edit', listener)
    this.app.workspace.activeEditor.on('scroll', codeblockListener)
  }

  private _process(processors: HtmlPostProcessor[]) {
    processors.forEach(p => p._process(editor.writingArea))
  }

  register(processor: TPostProcessor): DisposeFunc {
    if (typeof processor === 'function') {
      processor = PostProcessor.from(processor)
    }
    if (processor instanceof CodeblockPostProcessor && processor.hasPreview()) {
      processor.lang.forEach(lang => {
        if (this._codePreviewProcessors[lang]) {
          throw Error(`Codeblock postprocessor for lang "${lang}" is already registered.`)
        }
        this._codePreviewProcessors[lang] = processor as CodeblockPostProcessor
      })
    }
    this._processors.push(processor as any)
    return () => this.unregister(processor)
  }

  unregister(processor: TPostProcessor) {
    this._processors = this._processors.filter(p => p !== processor)
  }
}
