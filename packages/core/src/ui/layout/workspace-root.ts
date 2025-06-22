import './workspace-root.scss'
import { useService } from "src/common/service"
import { WorkspaceSplit } from "./split"
import { WorkspaceLeaf } from "./workspace-leaf"
import type { Workspace } from "../workspace"
import { editor } from 'typora'
import { View } from '../common/view'


export class WorkspaceRoot extends WorkspaceSplit {

  editorView = new EditorView()

  constructor(
    workspace: Workspace,
    viewManager = useService('view-manager'),
  ) {
    super('vertical')

    this.direction = 'vertical'

    $(document.body)
      .append($(this.containerEl)
        .addClass('typ-workspace-root')
        .on('focus', e => {
          workspace.activeLeaf = workspace.findViews(workspace.rootSplit, (v: WorkspaceLeaf) =>
            (<any>v).view.containerEl === e.target
          ).pop() as WorkspaceLeaf
        }))

    viewManager.registerViewWithExtensions(['md', 'markdown'], 'markdown', () => new EditorView())
    viewManager.registerView('core.empty', () => new EmptyView())

    this.insertChild(0, workspace.createLeaf({ type: 'markdown' }))
    this.insertChild(1, workspace.createLeaf({ type: 'core.empty' }))
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

  containerEl = $('<div class="typ-empty-view"><div>Empty</div></div>')[0]

}
