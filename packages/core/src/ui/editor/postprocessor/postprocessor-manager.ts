import { editor } from "typora"
import { PostProcessor, type RawProcessor } from './postprocessor'
import { HtmlPostProcessor } from './html-postprocessor'
import { CodeblockPostProcessor } from './codeblock-postprocessor'
import type { DisposeFunc } from "src/utils/types"
import { useEventBus } from "src/common/eventbus"


export type TPostProcessor = RawProcessor | PostProcessor | HtmlPostProcessor | CodeblockPostProcessor

export class MarkdownPostProcessor {

  private _processors: HtmlPostProcessor[] = []
  private _codePreviewProcessors: Record<string, CodeblockPostProcessor> = {}

  constructor() {
    setTimeout(() => this._registerProcessors())
  }

  private _registerProcessors() {
    const workspace = useEventBus('workspace')
    const activeEditor = useEventBus('markdown-editor')

    const listener = () => this._process(this._processors)

    const codeblockListener = () =>
      this._process(
        this._processors.filter(p =>
          'type' in p && p.type === 'codeblock'
        ))

    workspace.on('file:open', listener)
    activeEditor.on('edit', listener)
    activeEditor.on('scroll', codeblockListener)
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
    if (processor instanceof CodeblockPostProcessor && processor.hasPreview()) {
      processor.lang.forEach(lang => {
        delete this._codePreviewProcessors[lang]
      })
    }
    this._processors = this._processors.filter(p => p !== processor)
  }
}
