import { editor } from "typora"
import { PostProcessor, type RawProcessor } from './postprocessor'
import { HtmlPostProcessor } from './html-postprocessor'
import { CodeblockPostProcessor } from './codeblock-postprocessor'
import type { DisposeFunc } from "src/utils/types"
import { useEventBus } from "src/common/eventbus"
import { useService } from "src/common/service"
import { CodeblockExportProcessor } from "src/export-manager"
import { noop } from "src/utils"


export type TPostProcessor = RawProcessor | PostProcessor | HtmlPostProcessor | CodeblockPostProcessor

export class MarkdownPostProcessor {

  private _processors: HtmlPostProcessor[] = []
  private _codePreviewProcessors: Record<string, CodeblockPostProcessor> = {}

  constructor(private exporter = useService('exporter')) {
    setTimeout(() => this._registerProcessors())
  }

  private _registerProcessors() {
    const workspace = useEventBus('workspace')
    const activeEditor = useEventBus('markdown-editor')

    workspace.on('file:open', this._processAll)
    activeEditor.on('edit', this._processAll)
    activeEditor.on('scroll', this._processAllCodeblock)
  }

  private _process(processors: HtmlPostProcessor[]) {
    processors.forEach(p => p._process(editor.writingArea))
  }

  private _processAll = () => this._process(this._processors)

  private _processAllCodeblock = () => this._process(
    this._processors.filter(p =>
      'type' in p && p.type === 'codeblock'
    ))

  register(processor: TPostProcessor): DisposeFunc {
    if (typeof processor === 'function') {
      processor = PostProcessor.from(processor)
    }

    let disposeExportProcessor: DisposeFunc = noop
    if (processor instanceof CodeblockPostProcessor && processor.hasPreview()) {
      processor.lang.forEach(lang => {
        if (this._codePreviewProcessors[lang]) {
          throw Error(`Codeblock postprocessor for lang "${lang}" is already registered.`)
        }
        this._codePreviewProcessors[lang] = processor as CodeblockPostProcessor
      })
      if (processor.exportPreview) {
        disposeExportProcessor = this.exporter.register(CodeblockExportProcessor.from({ lang: processor.lang }))
      }
    }

    this._processors.push(processor as any)

    return () => {
      this.unregister(processor)
      disposeExportProcessor()
    }
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
