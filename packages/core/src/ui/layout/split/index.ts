import './index.scss'
import { WorkspaceParent } from '../workspace-parent'
import { WorkspaceNode } from '../workspace-node'


export class WorkspaceSplit extends WorkspaceParent {

  constructor(public direction: 'horizonal' | 'vertical') {
    super()

    $(this.containerEl)
      .addClass('typ-workspace-split')
      .append($('<hr class="typ-workspace-resize-handle">'))
  }

  appendChild(child: WorkspaceNode): void {
    super.appendChild(child)
    this.containerEl.append(child.containerEl)
  }
}
