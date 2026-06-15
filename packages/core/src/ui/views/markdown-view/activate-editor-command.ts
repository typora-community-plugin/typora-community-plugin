import { editor } from 'typora'
import type { Workspace } from 'src/ui/workspace'
import type { WorkspaceLeaf } from 'src/ui/layout/workspace-leaf'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import type { MarkdownViewMediator } from './markdown-view-mediator'


const KEY_OPENFILE = Symbol.for('openFile$original')

export interface ActivateEditorTarget {
  filePath: string
  leaf: WorkspaceLeaf
  setMode(mode: 'typora'): void
  restoreEditorStateFromLeaf(): void
}

export class ActivateEditorCommand {

  constructor(
    private target: ActivateEditorTarget,
    private mediator: MarkdownViewMediator,
    private workspace: Workspace,
    private syncEditorSize: () => void,
  ) {}

  execute(isSwappingSameFile: boolean) {
    const writeEl = editor.writingArea.parentElement!

    this._hideEditor(writeEl)
    this._setParent()
    this._openFile()

    const doSwap = () => {
      this.target.setMode('typora')
      this.syncEditorSize()
      this._showEditor(writeEl)
      this.target.restoreEditorStateFromLeaf()
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

  private _setParent() {
    this.mediator.parentTabs = this.target.leaf.parent as WorkspaceTabs
  }

  private _openFile() {
    // @ts-ignore — Typora internal API
    editor.library[KEY_OPENFILE](this.target.filePath)
  }

  private _showEditor(writeEl: HTMLElement) {
    writeEl.style.display = ''
  }
}
