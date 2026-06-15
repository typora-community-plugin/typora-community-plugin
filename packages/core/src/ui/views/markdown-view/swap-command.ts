import { editor } from 'typora'
import { useService } from 'src/common/service'
import type { WorkspaceLeaf } from 'src/ui/layout/workspace-leaf'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import type { MarkdownView } from '.'
import type { MdEditorMode } from './md-editor-mode'


const KEY_OPENFILE = Symbol.for('openFile$original')

export class SwapCommand {

  constructor(
    private workspace = useService('workspace'),
    private store = useService('markdown-view-store'),
  ) { }

  execute(editorLeaf: WorkspaceLeaf, previewLeaf: WorkspaceLeaf) {
    const isSwappingSameFile = editorLeaf.state.path === previewLeaf.state.path
    const previewView = previewLeaf.view as MarkdownView
    const writeEl = editor.writingArea.parentElement!

    this._hideEditor(writeEl)
    this._setParent(previewLeaf)
    this._openFile(previewLeaf.state.path)

    const doSwap = () => {
      previewView.setMode('typora')
      this._syncEditorSize(previewView)
      this._showEditor(writeEl)
      previewView.restoreEditorStateFromLeaf()
    }

    if (isSwappingSameFile) {
      doSwap()
    } else {
      this.workspace.once('file:open', doSwap)
    }
  }

  private _hideEditor(writeEl: HTMLElement) {
    writeEl.style.display = 'none'
    writeEl.classList.remove('typ-deactive')
  }

  private _setParent(previewLeaf: WorkspaceLeaf) {
    this.store.setParentTabs(previewLeaf.parent as WorkspaceTabs)
  }

  private _openFile(filePath: string) {
    // @ts-ignore — Typora internal API
    editor.library[KEY_OPENFILE](filePath)
  }

  private _syncEditorSize(previewView: MarkdownView) {
    // @ts-ignore
    const mode = previewView._modeState as MdEditorMode
    mode.syncSize()
  }

  private _showEditor(writeEl: HTMLElement) {
    writeEl.style.display = ''
  }
}
