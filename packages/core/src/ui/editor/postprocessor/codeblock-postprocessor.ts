import decorate from "@plylrnsdy/decorate.js"
import { editor } from "typora"
import { useService } from "src/common/service"
import { HtmlPostProcessor } from "./html-postprocessor"
import type { ButtonOptions, PostProcessorContext } from "./postprocessor"
import { MarkdownView } from "src/ui/views/markdown-view"
import { debounce } from "src/utils"


interface CodeblockContext {
  codeblock: HTMLPreElement
  code: string
}

interface CodeBlockButtonOptions extends ButtonOptions<CodeblockContext> {
}

export class CodeblockPostProcessor extends HtmlPostProcessor {
  type = 'codeblock'

  lang: string[] = ['']

  get selector() {
    const selector = this.lang
      .map(lang => lang ? `[lang="${lang}"]` : '')
      .map(langSelector => `.md-fences${langSelector}:has(.CodeMirror)`)
      .join(',')
    return selector
  }

  button?: CodeBlockButtonOptions

  exportPreview = false

  constructor(
    private workspace = useService('workspace'),
  ) {
    super()
  }

  preview(code: string, el: HTMLElement): HTMLElement | Promise<HTMLElement> {
    throw new Error('Method not implemented.')
  }

  process(el: HTMLElement, context: PostProcessorContext) {
    if (this.button) {
      this.renderButton(el, this.button)
    }
    if (this.hasPreview()) {
      this.buildPreviewer(el, this.preview)
    }
  }

  /**
   * If override `preview()` to render codeblock preview, then return `true`
   */
  hasPreview() {
    return this.preview !== CodeblockPostProcessor.prototype.preview
  }

  renderButton(parent: HTMLElement, button: CodeBlockButtonOptions) {
    const btn = button as CodeBlockButtonOptions & { $button: ButtonOptions<void> }
    if (!btn.$button) {
      btn.$button = {
        ...button,
        onclick: (event) => {
          const pre = event.target.closest('pre')!
          const code = this.getValueOfCodeblock(pre)
          button!.onclick(event, { codeblock: pre, code })
        },
      }
    }
    super.renderButton(parent, btn.$button)
  }

  private buildPreviewer(codeblock: HTMLElement, preview: CodeblockPostProcessor['preview']) {
    if (codeblock.querySelector('.md-diagram-panel-preview')) {
      return
    }

    const previewer = document.querySelector('#componenet > .md-diagram-panel')!.cloneNode(true) as HTMLElement
    previewer.style.cssText = 'position:initial; margin:0; padding:0;'
    previewer.addEventListener('click', () => {
      codeblock.classList.add('md-focus')
    })

    const containerEl = previewer.querySelector('.md-diagram-panel-preview')!
    const render = async () => {
      const code = this.getValueOfCodeblock(codeblock)
      const previewEl = await preview(code, codeblock)
      containerEl.innerHTML = ''
      containerEl.append(previewEl)
    }
    render()

    codeblock.classList.add('md-diagram', 'md-fences-advanced')
    codeblock.addEventListener('keyup', debounce(render, 1000))
    codeblock.append(previewer)
  }

  private getValueOfCodeblock(codeblock: HTMLElement) {
    const rootEl = codeblock.closest('#write') ?? codeblock.closest('.typ-markdown-view')
    const leaf = $(rootEl).is('#write')
      ? MarkdownView.parent.activedLeaf
      : this.workspace.rootSplit.findLeaf(leaf => leaf.view.containerEl === rootEl)
    const mdView = leaf.view as MarkdownView
    return mdView.getCodeMirrorInstance(codeblock.getAttribute('cid')!).getValue()
  }

  static from(options: Partial<Pick<CodeblockPostProcessor, 'lang' | 'button' | 'preview' | 'exportPreview' | 'process'>>) {
    const processor = new CodeblockPostProcessor()
    Object.assign(processor, options)
    return processor
  }
}

/**
 * Block `editor.fences.refreshEditor()` selecting `"[mdtype='fences']"` (including
 * preview of `MarkdownView`) out of `div#write`
 */
export function blockMarkdownViewPreviewMode() {
  decorate.parameters(editor.fences, 'refreshEditor', ([a0, a1, a2]) => [a0, a1, a2 ?? editor.writingArea])
}
