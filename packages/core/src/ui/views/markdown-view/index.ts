import './index.scss'
import { editor } from "typora"
import { useService } from 'src/common/service'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import type { WorkspaceLeaf } from 'src/ui/layout/workspace-leaf'
import { ScrollState, WorkspaceView } from 'src/ui/layout/workspace-view'
import { MdEditorMode } from './md-editor-mode'
import { MdPreviewerMode } from './md-previewer-mode'
import type { ModeContext, ModeController } from './mode-controller'
import { ActivateEditorCommand } from './activate-editor-command'


const KEY_OPENFILE = Symbol.for('openFile$original')


export class MarkdownView extends WorkspaceView {

  static type = 'core.markdown'

  containerEl = $('<div class="typ-markdown-view"></div>')[0]

  private _modeState: ModeController | null = null

  constructor(
    public leaf: WorkspaceLeaf,
    private workspace = useService('workspace'),
    private mdEditor = useService('markdown-editor'),
    private mdRenderer = useService('markdown-renderer'),
    private store = useService('markdown-view-store'),
  ) {
    super(leaf)
  }

  get filePath() {
    return this.leaf.state.path
  }

  private get _modeCtx(): ModeContext {
    return {
      filePath: this.filePath,
      leaf: this.leaf,
      containerEl: this.containerEl,
    }
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

      const editorLeaf = this.store.parentTabs?.findLeaf(leaf =>
        leaf.viewType === MarkdownView.type &&
        (leaf.view as MarkdownView).isEditor()
      )

      if (!editorLeaf) return

      (editorLeaf.view as MarkdownView).saveEditorStateToLeaf();

      (editorLeaf.view as MarkdownView).setMode('previewer')

      // Flag suppresses file:open side-effects during mode swap
      this.store.beginSwap(this.filePath)
      // Then switch clicked Previewer to Editor
      const isSwappingSameFile = editorLeaf.state.path === this.leaf.state.path
      const cmd = new ActivateEditorCommand(this, this.store, this.workspace, () => {
          const mode = this._modeState
          if (mode instanceof MdEditorMode) {
            mode.syncSize()
          }
        })
      cmd.execute(isSwappingSameFile)
      this.store.endSwap()
    })
  }

  isEditor() {
    return this._modeState instanceof MdEditorMode
  }

  getScroll(): ScrollState {
    return this._modeState?.getScroll() ?? super.getScroll()
  }

  applyScroll(state: ScrollState): void {
    this._modeState?.applyScroll(state)
  }

  autoSetMode() {
    if (!this.store.parentTabs || this.store.isActiveTabs(this.leaf.parent as WorkspaceTabs)) {
      this.setMode('typora')
    }
    else {
      this.setMode('previewer')
    }
  }

  onOpen() {
    this.autoSetMode()

    if (this.isEditor()) {
      editor.writingArea.parentElement!.classList.remove('typ-deactive')
      // @ts-ignore
      editor.library[KEY_OPENFILE](this.filePath)
    }
  }

  onClose() {
    if (this.isEditor()) {
      if (this.workspace.activeFile === this.filePath)
        editor.writingArea.parentElement!.classList.add('typ-deactive')
      // fix: can not close preview when dragging the only one Typora editor tab from Tabs A to Tabs B (which contains preview)
      if (this.store.getEditorTabsHasSingleChild()) {
        this.store.setParentTabs(null)

        // fix: will not open typora editor after the only one closed
        const nextMdLeaf = this.leaf.getRoot()
          .findLeaf(leaf => leaf.viewType === MarkdownView.type && leaf !== this.leaf)
        if (nextMdLeaf) (nextMdLeaf.parent as WorkspaceTabs).activeLeaf.view.onOpen()
      }
    }
    else {
      // fix: can not close preview tab when dragging it from Tabs B to Tabs A (which contains preview)
      this._modeState?.exit(this._modeCtx)
      this._modeState = null
    }
  }

  setMode(mode: 'typora' | 'previewer') {
    if (mode === 'previewer' && this._modeState instanceof MdEditorMode) {
      this.saveEditorStateToLeaf()
    }

    this._modeState?.exit(this._modeCtx)

    this._modeState = mode === 'typora'
      ? new MdEditorMode(this.store)
      : new MdPreviewerMode()

    this._modeState.enter(this._modeCtx)
    this.setIcon(mode === 'typora' ? 'fa-file-text-o' : 'fa-file-text')
  }

  saveEditorStateToLeaf() {
    const offset = this.mdEditor.selection.getCursor()
    if (offset != null) {
      this.leaf.state.cursorTextOffset = offset
    }
  }

  restoreEditorStateFromLeaf() {
    if (this.leaf.state.cursorTextOffset == null) return

    this.mdEditor.selection.setCursor(this.leaf.state.cursorTextOffset as number)
  }

  getCodeMirrorInstance(cid: string): CodeMirror.Editor {
    return this.isEditor()
      ? editor.fences.getCm(cid)!
      : this.mdRenderer.getCodeMirrorInstance(cid)
  }
}
