import { useService } from "src/common/service"
import type { View } from "../common/view"
import { WorkspaceNode } from "./workspace-node"
import type { ViewState } from "../view-manager"


export class WorkspaceLeaf extends WorkspaceNode {

  type = 'leaf'

  state: ViewState['state']
  viewType: string
  view: View

  constructor(view?: View, private viewManager = useService('view-manager')) {
    super()
    this.containerEl.classList.add('typ-workspace-leaf')
    this.view = view
  }

  isLeaf(): this is WorkspaceLeaf {
    return true
  }

  setState(state: ViewState) {
    const factory = this.viewManager.getViewCreatorByType(state.type)
    this.state = state.state ?? {}
    this.viewType = state.type
    this.view = factory(state)
    this.containerEl.append(this.view.containerEl)
    return this
  }

  toJSON() {
      return {
        type: 'leaf',
        state: this.state,
      }
  }
}
