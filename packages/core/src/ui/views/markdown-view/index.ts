import './index.scss'
import { editor } from "typora"
import { useService } from 'src/common/service'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import type { WorkspaceLeaf } from 'src/ui/layout/workspace-leaf'
import { ScrollState, WorkspaceView } from 'src/ui/layout/workspace-view'
import type { MarkdownViewMediator } from './markdown-view-mediator'
import { TyporaMode } from './mode-typora'
import { PreviewerMode } from './mode-previewer'
import type { ModeContext } from './mode-controller'
import { ActivateEditorCommand } from './activate-editor-command'


const KEY_OPENFILE = Symbol.for('openFile$original')


export class MarkdownView extends WorkspaceView {

  static type = 'core.markdown'

  containerEl = $('<div class="typ-markdown-view"></div>')[0]

  private _modeState: TyporaMode | PreviewerMode | null = null

  constructor(
    public leaf: WorkspaceLeaf,
    private workspace = useService('workspace'),
    private mdEditor = useService('markdown-editor'),
    private mdRenderer = useService('markdown-renderer'),
    private mediator = useService('markdown-view-mediator'),
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

      const editorLeaf = this.mediator.parentTabs?.findLeaf(leaf =>
        leaf.viewType === MarkdownView.type &&
        (leaf.view as MarkdownView).isEditor()
      )

      if (!editorLeaf) return

      (editorLeaf.view as MarkdownView).saveEditorStateToLeaf();

      (editorLeaf.view as MarkdownView).setMode('previewer')

      // Flag suppresses file:open side-effects during mode swap
      this.mediator.swappingLeaf = this.leaf
      // Then switch clicked Previewer to Editor
      const isSwappingSameFile = editorLeaf.state.path === this.leaf.state.path
      const cmd = new ActivateEditorCommand(this, this.mediator, this.workspace, () => {
        if (this._modeState instanceof TyporaMode) {
          const ctrl = this._modeState.controller as import('./md-editor-controller').MdEditorController
          ctrl.syncSize()
        }
      })
      cmd.execute(isSwappingSameFile)
      this.mediator.swappingLeaf = null
    })
  }

  isEditor() {
    return this._modeState instanceof TyporaMode
  }

  getScroll(): ScrollState {
    return this._modeState?.getScroll() ?? super.getScroll()
  }

  applyScroll(state: ScrollState): void {
    this._modeState?.applyScroll(state)
  }

  autoSetMode() {
    if (!this.mediator.parentTabs || this.mediator.parentTabs === this.leaf.parent) {
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
      if (this.mediator.parentTabs?.children.length === 1) {
        this.mediator.parentTabs = null

        const nextMdLeaf = this.leaf.getRoot()
          .findLeaf(leaf => leaf.viewType === MarkdownView.type && leaf !== this.leaf)
        if (nextMdLeaf) (nextMdLeaf.parent as WorkspaceTabs).activeLeaf.view.onOpen()
      }
    }
    else {
      this._modeState?.exit(this._modeCtx)
      this._modeState = null
    }
  }

  setMode(mode: 'typora' | 'previewer') {
    if (mode === 'previewer' && this._modeState instanceof TyporaMode) {
      this.saveEditorStateToLeaf()
    }

    this._modeState?.exit(this._modeCtx)

    this._modeState = mode === 'typora'
      ? new TyporaMode(this.mediator)
      : new PreviewerMode()

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
