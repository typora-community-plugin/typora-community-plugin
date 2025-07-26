import './workspace-root.scss'
import { WorkspaceSplit } from "./split"
import { WorkspaceLeaf } from "./workspace-leaf"
import type { Workspace } from "../workspace"


export class WorkspaceRoot extends WorkspaceSplit {

  constructor(workspace: Workspace) {
    super('vertical')

    this.direction = 'vertical'

    $(document.body)
      .append($(this.containerEl)
        .addClass('typ-workspace-root')
        .on('click', e => {
          workspace.activeLeaf = workspace.findViews(workspace.rootSplit, (leaf) =>
            (leaf as any as WorkspaceLeaf).view.containerEl === e.target
          ).pop() as any
        }))
  }
}
