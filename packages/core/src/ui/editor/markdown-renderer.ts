import './markdown-renderer.scss'
import { CodeMirror, editor, File, MathJax } from "typora"
import { useService } from "src/common/service"
import type { MdPreviewerMode } from '../views/markdown-view/md-previewer-mode'
import { memorize, parseMarkdown, uniqueId } from "src/utils"


const OPTIONS = {
  mode: 'text',
  readOnly: true,
  styleSelectedText: true,
  maxHighlightLength: 1 / 0,
  viewportMargin: 1 / 0,
  styleActiveLine: true,
  theme: " inner null-scroll",
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

const MarkdownParser = memorize(() => editor.nodeMap.allNodes.first()!.__proto__.constructor)

/**
 * Prefix applied to every `cid` of the rendered preview.
 *
 * Typora identifies nodes by `cid` in its document-wide lookups, e.g.
 * `$("[cid='"+cid+"']")` in `editor.fences.getCm()` / `addCodeBlock()` /
 * `fences.focus()`. It resets the node-id counter whenever a document is
 * switched (`nodeMap.reset(!1, !0)`), so a preview rendered earlier can share
 * ids with the currently edited document. Such collisions make Typora resolve
 * a codeblock `cid` to a preview node: it then attaches/focuses a CodeMirror on
 * the wrong element, leaving the codeblock empty and throwing
 * `Cannot read properties of undefined (reading 'insertChildAtIndex')`.
 *
 * Namespacing the preview ids keeps them out of Typora's editor lookups while
 * `getCodeMirrorInstance()` still finds them (callers read the attribute).
 */
const PREVIEW_CID_PREFIX = 'typ-preview-'

export class MarkdownRenderer {

  private _cmInstances: WeakMap<HTMLElement, CodeMirror.Editor> = new WeakMap()

  constructor(private mdEditor = useService('markdown-editor')) { }

  /**
   * Render markdown in HTMLElement
   */
  renderTo(md: string, targetEl: HTMLElement): void {

    // handle: preprocessor
    md = this.mdEditor.preProcessor.process('preload', md)

    // handle: front matter
    const { frontMatter, content } = parseMarkdown(md)
    const frontMattersHtml = frontMatter ? `<pre mdtype="meta_block" class="md-meta-block md-end-block">${frontMatter}</pre>` : ''

    // handle: markdown → html
    const [contentHtml] = MarkdownParser().parseFrom(content)
    targetEl.classList.add('typ-markdown-preview')
    targetEl.innerHTML = frontMattersHtml + contentHtml
    this._namespaceCids(targetEl)
    $('[contenteditable="true"]', targetEl).attr('contenteditable', 'false')

    // handle: code block highlight
    $('pre.md-fences', targetEl).each((i, el) => {
      const code = el.innerText
      el.innerHTML = ''
      const opts = {
        ...OPTIONS,
        // @ts-ignore
        mode: window.getCodeMirrorMode(el.getAttribute('lang')),
        lineWrapping: !File.option.noLineWrapping,
        lineNumbers: File.option.showLineNumbersForFence,
        indentUnit: File.option.codeIndentSize,
        tabSize: File.option.codeIndentSize,
      }
      const cm = CodeMirror(el, opts, FAKE_EDITOR, uniqueId('cm'))
      cm.setValue(code)
      this._cmInstances.set(el, cm)
    })

    // handle: latex render
    MathJax.typesetPromise($('.math-jax-preprocess', targetEl).toArray())

    // handle: postprocessor
    this.mdEditor.postProcessor.processAll(targetEl)
  }

  /**
   * Get the `CodeMirror` instance of the codeblock rendered by the {@link MdPreviewerMode} in the `WorkspaceRoot`
   */
  getCodeMirrorInstance(cid: string): CodeMirror.Editor {
    const el = $('.typ-workspace-root').find(`[cid="${cid}"]`)[0]
    return this._cmInstances.get(el)
  }

  /**
   * Prefix the `cid` of every rendered node so Typora's document-wide `[cid]`
   * lookups never resolve to preview nodes. See {@link PREVIEW_CID_PREFIX}.
   */
  private _namespaceCids(targetEl: HTMLElement): void {
    $(`[cid]`, targetEl).each((_, el) => {
      el.setAttribute('cid', PREVIEW_CID_PREFIX + el.getAttribute('cid'))
    })
  }
}
