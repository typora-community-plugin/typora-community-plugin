import { editor } from "typora"
import { useService } from "src/common/service"
import type { MarkdownEditor } from "../markdown-editor"
import { PostProcessor, type RawProcessor } from './postprocessor'
import { HtmlPostProcessor } from './html-postprocessor'
import { CodeblockPostProcessor } from './codeblock-postprocessor'
import type { WorkspaceLeaf } from "src/ui/layout/workspace-leaf"
import { CodeblockExportProcessor } from "src/export-manager"
import { noop } from "src/utils"
import type { DisposeFunc } from "src/utils/types"
import { MarkdownView } from "src/ui/views/markdown-view"


export type TPostProcessor = RawProcessor | PostProcessor | HtmlPostProcessor | CodeblockPostProcessor

export class MarkdownPostProcessor {

  private _processors: HtmlPostProcessor[] = []
  private _codePreviewProcessors: Record<string, CodeblockPostProcessor> = {}

  constructor(private exporter = useService('exporter')) {
  }

  process(writingArea: HTMLElement, processors: HtmlPostProcessor[] = this._processors) {
    processors.forEach(p => p._process(writingArea))
  }

  processAll = (writingArea: HTMLElement = editor.writingArea) =>
    this.process(writingArea, this._processors)

  processAllCodeblock = (writingArea: HTMLElement = editor.writingArea) =>
    this.process(writingArea, this._processors.filter(p => 'type' in p && p.type === 'codeblock'))

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

export function bindPostProcessorToEditor(mdEditor: MarkdownEditor) {

  const { postProcessor } = mdEditor

  setTimeout(() => {
    const workspace = useService('workspace')
    workspace.rootSplit.on('leaf:open', (leaf: WorkspaceLeaf) => {
      if (leaf.type === MarkdownView.type && (leaf.view as MarkdownView).isEidtor())
        postProcessor.processAll()
    })
  })

  mdEditor.on('edit', postProcessor.processAll)
  mdEditor.on('scroll', postProcessor.processAllCodeblock)
}
