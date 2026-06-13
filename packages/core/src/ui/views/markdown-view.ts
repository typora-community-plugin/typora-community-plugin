import './markdown-view.scss'
import { editor } from "typora"
import { useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import { ScrollState, WorkspaceView } from '../layout/workspace-view'
import type { WorkspaceTabs } from '../layout/tabs'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import type { DisposeFunc } from 'src/utils/types'


enum Mode { Typora, Previewer }

const KEY_OPENFILE = Symbol.for('openFile$original')

export class MarkdownView extends WorkspaceView {

  static type = 'core.markdown'

  /**
   * Typora editor's tabs
   */
  static parent: WorkspaceTabs | null = null

  /**
   * Set during Previewer↔Editor mode swap to suppress file:open side-effects.
   */
  static swappingLeaf: WorkspaceLeaf | null = null

  containerEl = $('<div class="typ-markdown-view"></div>')[0]

  currentMode!: Mode
  mdPreviewer: MarkdownPreviewer | null = null

  constructor(
    public leaf: WorkspaceLeaf,
    private workspace = useService('workspace'),
    private mdEditor = useService('markdown-editor'),
    private mdRenderer = useService('markdown-renderer'),
  ) {
    super(leaf)
  }

  get filePath() {
    return this.leaf.state.path
  }

  onload() {
    setTimeout(() => this.autoSetMode())
    this.register(
      this.leaf.getRoot().on('layout-changed', () => this.autoSetMode()))

    // Click on Previewer content area → swap: old editor → Previewer, clicked → Editor
    //
    // Save the current editor's cursor on mousedown (fires before browser moves focus).
    // This is critical because in the click handler the selection is no longer in #write.
    this.registerDomEvent(this.containerEl, 'mousedown', e => {
      if (this.isEditor()) return
      if ((e.target as HTMLElement).closest('a')) return

      const editorLeaf = MarkdownView.parent?.findLeaf(leaf =>
        leaf.viewType === MarkdownView.type &&
        (leaf.view as MarkdownView).isEditor()
      )

      if (!editorLeaf) return

      (editorLeaf.view as MarkdownView).saveEditorStateToLeaf();

      (editorLeaf.view as MarkdownView).setMode(Mode.Previewer)
      // Only transfer cursor state when both leaves show the same file.
      // When files differ, each leaf uses its own saved state (saved when it last
      // switched from Editor → Previewer).
      if (editorLeaf.state.path === this.leaf.state.path) {
        this.leaf.state.cursorTextOffset = editorLeaf.state.cursorTextOffset
      }

      // Flag suppresses file:open side-effects during mode swap
      MarkdownView.swappingLeaf = this.leaf
      // Then switch clicked Previewer to Editor
      this._activateEditor()
      MarkdownView.swappingLeaf = null
    })
  }

  isEditor() {
    return this.currentMode === Mode.Typora
  }

  getScroll(): ScrollState {
    if (this.isEditor()) {
      return { scrollTop: editor.writingArea.parentElement!.scrollTop }
    }
    return { scrollTop: this.containerEl.scrollTop }
  }

  applyScroll(state: ScrollState): void {
    if (this.isEditor()) {
      editor.writingArea.parentElement!.scrollTop = state.scrollTop
    } else {
      this.containerEl.scrollTop = state.scrollTop
    }
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

    if (this.isEditor()) {
      // Already the editor — just switch file
      editor.writingArea.parentElement!.classList.remove('typ-deactive')
      // @ts-ignore
      editor.library[KEY_OPENFILE](this.filePath)
    } else {
      this.switchToPreviewerMode(this.filePath)
    }
  }

  /**
   * _activateEditor is used for click-to-switch only.
   */
  private _activateEditor() {
    // 1. Hide #write so the user doesn't see the editor loading
    const writeEl = editor.writingArea.parentElement!
    writeEl.style.display = 'none'
    writeEl.classList.remove('typ-deactive')

    // Update MarkdownView.parent NOW before opening file,
    // so autoSetMode triggered by layout-changed sees the correct parent
    MarkdownView.parent = this.leaf.parent as WorkspaceTabs

    // 2. Open file in editor (populates #write in background)
    // @ts-ignore
    editor.library[KEY_OPENFILE](this.filePath)

    // 3. Wait for editor to finish rendering, then swap
    this.workspace.once('file:open', () => {
      this.setMode(Mode.Typora)

      // Sync position synchronously before showing #write, so CSS vars are correct
      // @ts-ignore
      InternalEditor.instance.syncSize()
      writeEl.style.display = ''

      // Restore editor scroll/cursor state saved from the previous Editor leaf
      this.restoreEditorStateFromLeaf()
    })
  }

  onClose() {
    if (this.isEditor()) {
      if (this.workspace.activeFile === this.filePath)
        editor.writingArea.parentElement!.classList.add('typ-deactive')
      // fix: can not close preview when dragging the only one Typora editor tab from Tabs A to Tabs B (which contains preview)
      if (MarkdownView.parent?.children.length === 1) {
        MarkdownView.parent = null

        // fix: will not open typora editor after the only one closed
        const nextMdLeaf = this.leaf.getRoot()
          .findLeaf(leaf => leaf.viewType === MarkdownView.type && leaf !== this.leaf)
        if (nextMdLeaf) (nextMdLeaf.parent as WorkspaceTabs).activeLeaf.view.onOpen()
      }
    }
    else {
      // fix: can not close preview tab when dragging it from Tabs B to Tabs A (which contains preview)
      this.mdPreviewer?.deactive(this.containerEl)
      this.mdPreviewer = null
    }
  }

  private setMode(mode: Mode) {
    // Save editor scroll/cursor state before switching to Previewer
    if (mode === Mode.Previewer && this.currentMode === Mode.Typora) {
      this.saveEditorStateToLeaf()
    }

    this.currentMode = mode
    if (mode === Mode.Typora) {
      this.switchToTyporaMode()
    } else {
      this.switchToPreviewerMode(this.filePath)
    }
  }

  private saveEditorStateToLeaf() {
    const offset = this.mdEditor.selection.getCursor()
    if (offset != null) {
      this.leaf.state.cursorTextOffset = offset
    }
  }

  private restoreEditorStateFromLeaf() {
    if (this.leaf.state.cursorTextOffset == null) return

    this.mdEditor.selection.setCursor(this.leaf.state.cursorTextOffset as number)
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

  private switchToPreviewerMode(filePath: string) {
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
    return this.isEditor()
      ? editor.fences.getCm(cid)!
      : this.mdRenderer.getCodeMirrorInstance(cid)
  }
}

class InternalEditor {

  private static _instance: InternalEditor

  static get instance() {
    return this._instance ??= new InternalEditor()
  }

  contentEl = editor.writingArea.parentElement!
  handleSettingActiveLeaf: ((this: HTMLElement, ev: MouseEvent) => any) | null = null
  handleLayoutChanged: DisposeFunc | null = null

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
    if (objectEl?.contentWindow) objectEl.contentWindow.onresize = this.syncSize
  }

  private unregisterObserver(el: HTMLElement) {
    const objectEl = el.children[0] as HTMLObjectElement | undefined
    if (objectEl?.contentWindow) objectEl.contentWindow.onresize = null
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

export class MarkdownPreviewer {

  constructor(private mdRenderer = useService('markdown-renderer')) { }

  active(containerEl: HTMLElement, path: string) {
    fs.readText(path).then(md =>
      this.mdRenderer.renderTo(md, containerEl))
  }

  deactive(containerEl: HTMLElement) {
    containerEl.innerHTML = ''
  }
}
