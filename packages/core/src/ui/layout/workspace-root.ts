import './workspace-root.scss'
import { WorkspaceSplit } from "./split"
import { WorkspaceLeaf } from "./workspace-leaf"
import type { Workspace } from "../workspace"
import { editor } from 'typora'
import { View } from '../common/view'
import { uniqueId } from 'src/utils'


export class WorkspaceRoot extends WorkspaceSplit {

  editorView = new EditorView()

  constructor(workspace: Workspace) {
    super('vertical')

    this.direction = 'vertical'

    $(document.body)
      .append($(this.containerEl)
        .addClass('typ-workspace-root')
        .on('click', e => {
          workspace.activeLeaf = workspace.findViews(workspace.rootSplit, (leaf: WorkspaceLeaf) =>
            leaf.view.containerEl === e.target
          ).pop() as WorkspaceLeaf
        }))
  }
}

// 同步占位 view 的位置、大小到 content
export class EditorView extends View {

  contentEl = editor.writingArea.parentElement

  /**
   * Placeholder
   */
  containerEl = $('<div class="typ-editor-view">')[0]

  constructor() {
    super()
    setTimeout(() => this.syncSize())
    window.addEventListener('resize', () => this.syncSize())
  }

  private syncSize() {
    document.body.style.setProperty('--typ-editor-width', this.containerEl.offsetWidth + 'px')
    document.body.style.setProperty('--typ-editor-height', this.containerEl.offsetHeight + 'px')
  }
}

export class EmptyView extends View {

  containerEl = $(`<div class="typ-empty-view"><div>Empty ${uniqueId('View ')}</div></div>`)[0]

}
