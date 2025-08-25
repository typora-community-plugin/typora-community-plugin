import { CodeMirror, editor, getCodeMirrorMode } from "typora"
import { useService } from "src/common/service"
import { parseMarkdown, uniqueId } from "src/utils"


const OPTIONS = {
  mode: 'text',
  readOnly: true,
  styleSelectedText: true,
  maxHighlightLength: 1 / 0,
  viewportMargin: 1 / 0,
  styleActiveLine: true,
  theme: " inner null-scroll",
  lineWrapping: true,
  lineNumbers: true,
  resetSelectionOnContextMenu: true,
  cursorScrollMargin: 60,
  dragDrop: false,
  scrollbarStyle: "null",
}

const FAKE_EDITOR = {
  sourceView: {
    inSourceMode: false,
  },
  undo: {
    register() { },
    lastRegisteredOperationCommand() { },
  }
}

export class MarkdownRenderer {

  constructor(private mdEditor = useService('markdown-editor')) { }

  /**
   * Render markdown in HTMLElement
   */
  renderTo(md: string, targetEl: HTMLElement): void {

    // handle: preprocessor
    md = this.mdEditor.preProcessor.process('preload', md)

    // handle: front matter
    const { frontMatters, content } = parseMarkdown(md)
    const frontMattersHtml = frontMatters.length ? `<pre mdtype="meta_block" class="md-meta-block md-end-block">${frontMatters.join('\n')}</pre>` : ''

    // handle: markdown → html
    const [contentHtml] = editor.nodeMap.allNodes.first().__proto__.constructor.parseFrom(content)
    targetEl.innerHTML = frontMattersHtml + contentHtml
    $('[contenteditable="true"]', targetEl).attr('contenteditable', 'false')

    // handle: code block highlight
    $('pre.md-fences', targetEl).each((i, el) => {
      const code = el.innerText
      el.innerHTML = ''
      const opts = { ...OPTIONS, mode: getCodeMirrorMode(el.getAttribute('lang')) }
      const cm = CodeMirror(el, opts, FAKE_EDITOR, uniqueId('cm'))
      cm.setValue(code)
    })

    // handle: postprocessor
    // this.mdEditor.postProcessor.processAll(targetEl)
  }
}
