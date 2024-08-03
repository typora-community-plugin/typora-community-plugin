import { editor } from "typora"
import { HtmlPostProcessor } from "./html-postprocessor"
import type { ButtonOptions } from "./postprocessor"
import { debounce } from "src/utils/function/debounce"


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

  preview(code: string, el: HTMLElement): HTMLElement | Promise<HTMLElement> {
    throw new Error('Method not implemented.')
  }

  process(el: HTMLElement) {
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
          const cid = pre.getAttribute('cid')!
          const code = editor.fences.getValue(cid)
          button!.onclick(event, { codeblock: pre, code })
        },
      }
    }
    super.renderButton(parent, btn.$button)
  }

  private buildPreviewer(
    codeblock: HTMLElement,
    preview: CodeblockPostProcessor['preview']
  ) {
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
      const code = editor.fences.getValue(codeblock.getAttribute('cid')!)
      const previewEl = await preview(code, codeblock)
      containerEl.innerHTML = ''
      containerEl.append(previewEl)
    }
    render()

    codeblock.classList.add('md-diagram', 'md-fences-advanced')
    codeblock.addEventListener('keyup', debounce(render, 1000))
    codeblock.append(previewer)
  }

  static from(options: Partial<Pick<CodeblockPostProcessor, 'lang' | 'button' | 'preview' | 'process'>>) {
    const processor = new CodeblockPostProcessor()
    Object.assign(processor, options)
    return processor
  }
}
