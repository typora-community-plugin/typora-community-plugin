import decorate from "@plylrnsdy/decorate.js"
import { editor } from "typora"
import type { DisposeFunc } from "./utils/types"
import { useService } from "./common/service"


export class ExportManager {

  private _processors: ExportProcessor[] = []

  constructor() {
    setTimeout(() => {
      const { postProcessor } = useService('markdown-editor')

      decorate.returnValue(editor.export, 'exportToHTML', (args, html) => {
        postProcessor.processAllCodeblock()

        const doc = new DOMParser().parseFromString(html, 'text/html')
        const ctx: HtmlExportContext = {
          type: 'html',
          html,
          doc,
        }
        this._processHtml(ctx)
        return `<!DOCTYPE HTML>\n${doc.documentElement.outerHTML}`
      })
    })
  }

  register(processor: ExportProcessor): DisposeFunc {
    this._processors.push(processor)
    return () => this.unregister(processor)
  }

  unregister(processor: ExportProcessor) {
    this._processors = this._processors.filter(p => p !== processor)
  }

  private _processHtml(ctx: HtmlExportContext) {
    this._processors
      .filter(p => p.type === 'html')
      .forEach(p => p.process(ctx))
  }
}


interface ExportContext extends Record<string, any> {
  type: 'html'
}

export class ExportProcessor {

  type: ExportContext['type']

  process(context: ExportContext): void { }

  static from(options: Partial<Pick<ExportProcessor, 'type' | 'process'>>) {
    const processor = new ExportProcessor()
    Object.assign(processor, options)
    return processor
  }
}


interface HtmlExportContext extends ExportContext {
  html: string
  doc: Document
}

export class HtmlExportProcessor extends ExportProcessor {
  type = 'html' as const

  process(context: HtmlExportContext): void { }

  static from(options: Partial<Pick<HtmlExportProcessor, 'process'>>) {
    const processor = new HtmlExportProcessor()
    Object.assign(processor, options)
    return processor
  }
}


export class CodeblockExportProcessor extends HtmlExportProcessor {
  lang: string[]

  process({ doc }: HtmlExportContext): void {
    const selectors = this.lang.map(l => `pre[lang="${l}"]`)

    const previewSelectors = selectors.map(l => `${l} .md-fences-adv-panel-preview`)

    // pick the preview from the editor
    const previews = $(previewSelectors.join(','))

    // copy the preview to the exported html
    $(selectors.join(','), doc)
      .removeClass()
      .addClass('md-diagram-panel md-fences-adv-panel')
      .empty()
      .each((i, pre) => {
        $(pre).append($(previews[i].innerHTML))
      })
  }

  static from(options: Partial<Pick<CodeblockExportProcessor, 'lang' | 'process'>>) {
    const processor = new CodeblockExportProcessor()
    Object.assign(processor, options)
    return processor
  }
}
