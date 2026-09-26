import { editor } from 'typora'
import { Component } from 'src/common/component'
import { useService } from 'src/common/service'
import type { WorkspaceLeaf } from 'src/ui/layout/workspace-leaf'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import type { MarkdownView } from '.'
import type { MdEditorMode } from './md-editor-mode'
import { useEditingTabs } from './use-editing-tabs'
import { usePreviewTabToSwap } from './use-preview-tab-to-swap'
import { useRecord } from './use-record'
import { useSettingEffectedFeature } from 'src/settings/use-setting-effect'


const KEY_OPENFILE = Symbol.for('openFile$original')

export class SwapCommand extends Component {

  constructor(
    private workspace = useService('workspace'),
  ) {
    super()

    useSettingEffectedFeature('useAutoSwap', this)
  }

  execute(editorLeaf: WorkspaceLeaf<MarkdownView>, previewLeaf: WorkspaceLeaf<MarkdownView>) {
    if (!this._loaded) return

    const isSwappingSameFile = editorLeaf.state.path === previewLeaf.state.path
    const previewView = previewLeaf.view
    const writeEl = editor.writingArea.parentElement!
    const { saveStateToLeaf, restoreStateFromLeaf } = useRecord()
    const { beginSwap, endSwap } = usePreviewTabToSwap()

    saveStateToLeaf(editorLeaf.view)
    saveStateToLeaf(previewView)
    editorLeaf.view.setMode('previewer')

    beginSwap(previewLeaf)
    this._hideEditor(writeEl)
    this._setParent(previewLeaf)
    this._openFile(previewLeaf.state.path)

    const doSwap = () => {
      previewView.setMode('typora')
      this._syncEditorSize(previewView)
      this._showEditor(writeEl)
      setTimeout(() => {
        restoreStateFromLeaf(editorLeaf.view)
        restoreStateFromLeaf(previewView)
        endSwap()
      })
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
    const { setEditingTabs } = useEditingTabs()
    setEditingTabs(previewLeaf.parent as WorkspaceTabs)
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
