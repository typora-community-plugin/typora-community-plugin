import './index.scss'
import { editor } from "typora"
import { useService } from 'src/common/service'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import type { WorkspaceLeaf } from 'src/ui/layout/workspace-leaf'
import { ScrollState, WorkspaceView } from 'src/ui/layout/workspace-view'
import { MdEditorMode } from './md-editor-mode'
import { MdPreviewerMode } from './md-previewer-mode'
import type { ModeContext, ModeController } from './mode-controller'
import { SwapCommand } from './swap-command'
import { useEditingTabs } from './use-editing-tabs'


const KEY_OPENFILE = Symbol.for('openFile$original')

type MarkdownViewState = {
  scrollTop: number,
  cursorOffset: number
}

export class MarkdownView extends WorkspaceView {

  static type = 'core.markdown'

  /** @override */
  containerEl = $('<div class="typ-markdown-view"></div>')[0]

  private _modeState: ModeController | null = null
  private _swapCommad = new SwapCommand()

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

  private get _modeCtx(): ModeContext {
    return {
      filePath: this.filePath,
      leaf: this.leaf,
      containerEl: this.containerEl,
    }
  }

  /** @override */
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

      const { editingTabs } = useEditingTabs()
      const editorLeaf = editingTabs()
        ?.findLeaf<WorkspaceLeaf<MarkdownView>>(leaf =>
          leaf.viewType === MarkdownView.type &&
          (leaf.view as MarkdownView).isEditor()
        )

      if (!editorLeaf) return

      // Then switch clicked Previewer to Editor
      this._swapCommad.execute(editorLeaf, this.leaf as WorkspaceLeaf<MarkdownView>)
    })
  }

  isEditor() {
    return this._modeState instanceof MdEditorMode
  }

  /** @override */
  getScroll(): ScrollState {
    return this._modeState?.getScroll() ?? super.getScroll()
  }

  /** @override */
  applyScroll(state: ScrollState): void {
    this._modeState?.applyScroll(state)
  }

  /** @private */
  autoSetMode() {
    const { editingTabs, isEditingTabs } = useEditingTabs()
    if (!editingTabs() || isEditingTabs(this.leaf.parent as WorkspaceTabs)) {
      this.setMode('typora')
    }
    else {
      this.setMode('previewer')
    }
  }

  /** @override */
  onOpen() {
    this.autoSetMode()

    if (this.isEditor()) {
      editor.writingArea.parentElement!.classList.remove('typ-deactive')
      // @ts-ignore
      editor.library[KEY_OPENFILE](this.filePath)
    }
  }

  /** @override */
  onClose() {
    if (this.isEditor()) {
      if (this.workspace.activeFile === this.filePath)
        editor.writingArea.parentElement!.classList.add('typ-deactive')

      // fix: can not close preview when dragging the only one Typora editor tab from Tabs A to Tabs B (which contains preview)
      const { setEditingTabs, isEditingSingleChildTabs } = useEditingTabs()
      if (isEditingSingleChildTabs()) {
        setEditingTabs(null)

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

  /** @private */
  setMode(mode: 'typora' | 'previewer') {
    this._modeState?.exit(this._modeCtx)

    this._modeState = mode === 'typora'
      ? new MdEditorMode()
      : new MdPreviewerMode()

    this._modeState.enter(this._modeCtx)
    this.setIcon(mode === 'typora' ? 'fa-file-text-o' : 'fa-file-text')
  }

  getState() {
    const state: MarkdownViewState = {
      ...this.getScroll(),
      cursorOffset: 0,
    }
    if (this.isEditor()) {
      state.cursorOffset = this.mdEditor.selection.getCursor()!
    }
    return state
  }

  setState(state: Partial<MarkdownViewState>) {
    if (state.scrollTop != null)
      this.applyScroll(state as any)
    if (state.cursorOffset != null && this.isEditor())
      this.mdEditor.selection.setCursor(state.cursorOffset)
  }

  getCodeMirrorInstance(cid: string): CodeMirror.Editor {
    return this.isEditor()
      ? editor.fences.getCm(cid)!
      : this.mdRenderer.getCodeMirrorInstance(cid)
  }
}
