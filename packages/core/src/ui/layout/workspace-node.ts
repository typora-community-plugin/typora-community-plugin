import { Events } from "src/common/events"
import type { WorkspaceParent } from "./workspace-parent"
import type { WorkspaceLeaf } from "./workspace-leaf"


export abstract class WorkspaceNode extends Events<any> {

  parent: WorkspaceParent
  containerEl: HTMLElement

  constructor() {
    super()
    this.containerEl = $('<div>')[0]
  }

  abstract isLeaf(): this is WorkspaceLeaf

  setParent(parent: WorkspaceParent) {
    this.parent = parent
    this.parent.containerEl.append(this.containerEl)
  }

  detach() {
    this.parent?.removeChild(this)
  }
}
