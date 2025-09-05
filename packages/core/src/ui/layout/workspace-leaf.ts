import { useService } from "src/common/service"
import { WorkspaceNode } from "./workspace-node"
import type { ViewState } from "../view-manager"
import { WorkspaceView } from "./workspace-view"


export class WorkspaceLeaf<V extends WorkspaceView = WorkspaceView> extends WorkspaceNode {

  type = 'leaf'

  state: ViewState['state']
  viewType: string
  view: V

  constructor(view?: V, private viewManager = useService('view-manager')) {
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
    this.view = factory(this, state) as V
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
