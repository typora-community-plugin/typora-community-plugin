import { Component } from 'src/common/component'
import { useService } from 'src/common/service'
import { useSettingEffectedFeature } from 'src/settings/use-setting-effect'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import { useActiveLeaf } from 'src/ui/layout/use-active-leaf'
import type { WorkspaceLeaf } from 'src/ui/layout/workspace-leaf'
import { editor } from 'typora'
import type { MarkdownView } from '.'
import type { MdEditorMode } from './md-editor-mode'
import { useEditingTabs } from './use-editing-tabs'
import { usePreviewTabToSwap } from './use-preview-tab-to-swap'
import { useRecord } from './use-record'


const KEY_OPENFILE = Symbol.for('openFile$original')

export class SwapCommand extends Component {

  constructor(
    private settings = useService('settings'),
    private workspace = useService('workspace'),
  ) {
    super()

    useSettingEffectedFeature('useAutoSwap', this)
  }

  /**
   * The parent MarkdownView force-loads this child on every view open
   * (`Component.load()` → children), which would re-enable swap on views
   * created while the setting is off. Gate on the setting so a disabled
   * `useAutoSwap` stays disabled.
   */
  override load() {
    if (!this.settings.get('useAutoSwap')) return
    super.load()
  }

  execute(editorLeaf: WorkspaceLeaf<MarkdownView>, previewLeaf: WorkspaceLeaf<MarkdownView>) {
    if (!this._loaded) return

    const isSwappingSameFile = editorLeaf.state.path === previewLeaf.state.path
    const previewView = previewLeaf.view
    const writeEl = editor.writingArea.parentElement!
    const { saveStateToLeaf, restoreStateFromLeaf } = useRecord()
    const { beginSwap, endSwap, markLeafInSwap } = usePreviewTabToSwap()

    saveStateToLeaf(editorLeaf.view)
    saveStateToLeaf(previewView)
    editorLeaf.view.setMode('previewer')
    // Both swap leaves must be skipped by the "open the next md leaf" fix in
    // `MarkdownView#onClose()`: a teardown (e.g. `core.workspace:reset`)
    // detaching the only editor leaf would reopen the swapped preview leaf
    // and leave a duplicate tab in the non-editing tabs group.
    markLeafInSwap(editorLeaf)
    markLeafInSwap(previewLeaf)

    beginSwap(previewLeaf)
    this._hideEditor(writeEl)
    this._setParent(previewLeaf)

    const [, setActiveLeaf] = useActiveLeaf()
    setActiveLeaf(previewLeaf)
    this._openFile(previewLeaf.state.path)

    const doSwap = () => {
      // A teardown (e.g. `core.workspace:reset`) can detach the leaves while
      // the async `_openFile` → `file:open` is in flight. Reopening a detached
      // preview leaf here rebinds the native editor to a leaf outside the
      // layout and leaves a duplicate tab in the old tabs group, so only
      // clear the swap flag.
      if (!this._loaded || !previewLeaf.parent) {
        endSwap()
        return
      }
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
      // Register the disposer so closing this view cancels the pending swap;
      // a bare `once()` on the workspace service outlives teardown.
      this.register(this.workspace.once('file:open', doSwap))
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
    // @ts-expect-error — Typora internal API
    editor.library[KEY_OPENFILE](filePath)
  }

  private _syncEditorSize(previewView: MarkdownView) {
    // @ts-expect-error
    const mode = previewView._modeState as MdEditorMode
    mode.syncSize()
  }

  private _showEditor(writeEl: HTMLElement) {
    writeEl.style.display = ''
  }
}
