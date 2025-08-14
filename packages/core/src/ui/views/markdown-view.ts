import './markdown-view.scss'
import { CodeMirror, editor, getCodeMirrorMode } from "typora"
import { useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import { WorkspaceView } from '../layout/workspace-view'
import type { WorkspaceTabs } from '../layout/tabs'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import { parseMarkdown, uniqueId } from 'src/utils'
import type { DisposeFunc } from 'src/utils/types'


enum Mode { Typora, Previewer }

export class MarkdownView extends WorkspaceView {

  static type = 'core.markdown'

  static parent: WorkspaceTabs

  /**
   * Placeholder
   */
  containerEl = $('<div class="typ-editor-view"></div>')[0]

  currentMode: Mode
  mdPreviewer?: MarkdownPreviewer

  constructor(
    leaf: WorkspaceLeaf,
    public filePath?: string,
    private workspace = useService('workspace'),
  ) {
    super(leaf)
  }

  onload() {
    setTimeout(() => this.autoSetMode())
    this.register(
      this.leaf.getRoot().on('layout-changed', () => this.autoSetMode()))
  }

  autoSetMode() {
    if (!MarkdownView.parent || MarkdownView.parent === this.leaf.parent) {
      this.setMode(Mode.Typora)
    }
    else {
      this.setMode(Mode.Previewer)
    }
  }

  onOpen() {
    this.autoSetMode()
  }

  onClose() {
    if (this.currentMode === Mode.Typora) {
      if (this.workspace.activeFile === this.filePath)
        editor.writingArea.parentElement.classList.add('typ-deactive')
      // fix: can not close codemirror editor when dragging the only one Typora editor tab from Tabs A to Tabs B (which contains CodeMirror editor)
      if (MarkdownView.parent.children.length === 1) {
        MarkdownView.parent = null
      }
    }
    else {
      // fix: can not close codemirror tab when dragging it from Tabs B to Tabs A (which contains Typora editor)
      this.mdPreviewer?.deactive(this.containerEl)
      this.mdPreviewer = null
    }
  }

  private setMode(mode: Mode) {
    this.currentMode = mode
    if (mode === Mode.Typora) {
      this.switchToTyporaMode()
    } else {
      this.switchToPreviewerMode(this.filePath)
    }
  }

  private switchToTyporaMode() {
    const { containerEl } = this
    containerEl.classList.remove('mode-previewer')
    this.mdPreviewer?.deactive(containerEl)
    this.mdPreviewer = null
    this.setIcon('fa-file-text-o')

    containerEl.classList.add('mode-typora')
    InternalEditor.instance.active(containerEl, this)
  }

  private switchToPreviewerMode(filePath?: string) {
    const { containerEl } = this
    containerEl.classList.remove('mode-typora')
    if (MarkdownView.parent === this.leaf.parent) {
      InternalEditor.instance.deactive(containerEl)
    }

    containerEl.classList.add('mode-previewer')
    this.mdPreviewer = new MarkdownPreviewer()
    this.mdPreviewer.active(containerEl, filePath);
    this.setIcon('fa-file-text')
  }
}

class InternalEditor {

  private static _instance: InternalEditor

  static get instance() {
    return this._instance ??= new InternalEditor()
  }

  contentEl = editor.writingArea.parentElement
  handleSettingActiveLeaf: (this: HTMLElement, ev: MouseEvent) => any
  handleLayoutChanged: DisposeFunc

  private constructor(private workspace = useService('workspace')) { }

  active(containerEl: HTMLElement, view: MarkdownView) {
    containerEl.innerHTML = '<object type="text/html" data="about:blank"></object>'

    this.contentEl.classList.add('typ-workspace-binding')
    this.contentEl.classList.remove('typ-deactive')
    this.contentEl.addEventListener('mousedown', this.handleSettingActiveLeaf = () => {
      this.workspace.activeLeaf = view.leaf
    })

    MarkdownView.parent = view.leaf.parent as WorkspaceTabs
    setTimeout(() => {
      editor.library.openFile(view.filePath)
      this.syncSize()
      this.registerObserver(containerEl)
      this.handleLayoutChanged = view.leaf.getRoot()
        .on('layout-changed', () => this.registerObserver(containerEl))
    })
  }

  deactive(containerEl: HTMLElement) {
    containerEl.innerHTML = ''

    this.contentEl.classList.remove('typ-workspace-binding')
    this.contentEl.removeEventListener('mousedown', this.handleSettingActiveLeaf!)
    this.unregisterObserver(containerEl)
    this.handleLayoutChanged?.()
    this.handleLayoutChanged = null
  }

  private registerObserver(el: HTMLElement) {
    const objectEl = el.children[0] as HTMLObjectElement
    if (objectEl.contentWindow) objectEl.contentWindow.onresize = this.syncSize
  }

  private unregisterObserver(el: HTMLElement) {
    const objectEl = el.children[0] as HTMLObjectElement
    if (objectEl.contentWindow) objectEl.contentWindow.onresize = null
  }

  private syncSize() {
    if (!MarkdownView.parent) return

    const { style } = document.body
    const targetEl = MarkdownView.parent.tabContentEl
    const rect = targetEl.getBoundingClientRect()
    style.setProperty('--typ-editor-top', rect.top + 'px')
    style.setProperty('--typ-editor-left', rect.left + 'px')
    style.setProperty('--typ-editor-width', rect.width + 'px')
    style.setProperty('--typ-editor-height', rect.height + 'px')
  }
}

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

class MarkdownPreviewer {

  constructor(private editor = useService('markdown-editor')) { }

  active(containerEl: HTMLElement, path: string) {
    let md = fs.readTextSync(path)

    // handle: preprocessor
    md = this.editor.preProcessor.process('preload', md)

    // handle: front matter
    const { frontMatters, content } = parseMarkdown(md)
    const frontMattersHtml = frontMatters.length ? `<pre mdtype="meta_block" class="md-meta-block md-end-block">${frontMatters.join('\n')}</pre>` : ''

    // handle: markdown → html
    const [contentHtml] = editor.nodeMap.allNodes.first().__proto__.constructor.parseFrom(content)
    containerEl.innerHTML = frontMattersHtml + contentHtml
    $('[contenteditable="true"]', containerEl).attr('contenteditable', 'false')

    // handle: code block highlight
    $('pre.md-fences', containerEl).each((i, el) => {
      const code = el.innerText
      el.innerHTML = ''
      const opts = { ...OPTIONS, mode: getCodeMirrorMode(el.getAttribute('lang')) }
      const cm = CodeMirror(el, opts, FAKE_EDITOR, uniqueId('cm'))
      cm.setValue(code)
    })

    // handle: postprocessor
    // this.editor.postProcessor.processAll(containerEl)
  }

  deactive(containerEl: HTMLElement) {
    containerEl.innerHTML = ''
  }
}
