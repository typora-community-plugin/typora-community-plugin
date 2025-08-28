import './markdown-view.scss'
import { CodeMirror, editor } from "typora"
import { useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import { WorkspaceView } from '../layout/workspace-view'
import type { WorkspaceTabs } from '../layout/tabs'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import type { DisposeFunc } from 'src/utils/types'


enum Mode { Typora, Previewer }

export class MarkdownView extends WorkspaceView {

  static type = 'core.markdown'

  static parent: WorkspaceTabs

  containerEl = $('<div class="typ-markdown-view"></div>')[0]

  currentMode: Mode
  mdPreviewer?: MarkdownPreviewer

  constructor(
    leaf: WorkspaceLeaf,
    public filePath?: string,
    private workspace = useService('workspace'),
    private mdRenderer = useService('markdown-renderer'),
  ) {
    super(leaf)
  }

  onload() {
    setTimeout(() => this.autoSetMode())
    this.register(
      this.leaf.getRoot().on('layout-changed', () => this.autoSetMode()))
  }

  isEidtor() {
    return this.currentMode === Mode.Typora
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
    if (this.isEidtor()) {
      editor.writingArea.parentElement.classList.remove('typ-deactive')
      editor.library.openFile(this.filePath)
    }
  }

  onClose() {
    if (this.isEidtor()) {
      if (this.workspace.activeFile === this.filePath)
        editor.writingArea.parentElement.classList.add('typ-deactive')
      // fix: can not close preview when dragging the only one Typora editor tab from Tabs A to Tabs B (which contains preview)
      if (MarkdownView.parent.children.length === 1) {
        MarkdownView.parent = null

        // fix: will not open typora editor after the only one closed
        const nextMdLeaf = this.leaf.getRoot()
          .filterLeaves(leaf => leaf.viewType === MarkdownView.type)
          .filter(leaf => leaf !== this.leaf)
          .shift()
        if (nextMdLeaf) (nextMdLeaf.parent as WorkspaceTabs).activedLeaf.view.onOpen()
      }
    }
    else {
      // fix: can not close preview tab when dragging it from Tabs B to Tabs A (which contains preview)
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

  getCodeMirrorInstance(cid: string): CodeMirror.Editor {
    return this.isEidtor()
      ? editor.fences.getCm(cid)
      : this.mdRenderer.getCodeMirrorInstance(cid)
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
    /**
     * Placeholder
     */
    containerEl.innerHTML = '<object type="text/html" data="about:blank"></object>'

    this.contentEl.classList.add('typ-workspace-binding')
    this.contentEl.addEventListener('mousedown', this.handleSettingActiveLeaf = () => {
      this.workspace.activeLeaf = view.leaf
    })

    MarkdownView.parent = view.leaf.parent as WorkspaceTabs
    setTimeout(() => {
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

class MarkdownPreviewer {

  constructor(private mdRenderer = useService('markdown-renderer')) { }

  active(containerEl: HTMLElement, path: string) {
    let md = fs.readTextSync(path)

    this.mdRenderer.renderTo(md, containerEl)
  }

  deactive(containerEl: HTMLElement) {
    containerEl.innerHTML = ''
  }
}
