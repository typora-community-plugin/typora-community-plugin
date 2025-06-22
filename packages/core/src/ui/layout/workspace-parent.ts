import type { WorkspaceLeaf } from "./workspace-leaf"
import { WorkspaceNode } from "./workspace-node"


export abstract class WorkspaceParent extends WorkspaceNode {

  protected children: WorkspaceNode[] = []

  isLeaf(): this is WorkspaceLeaf {
    return false
  }

  appendChild(child: WorkspaceNode) {
    this.insertChild(this.children.length, child)
  }

  insertChild(index: number, child: WorkspaceNode) {
    child.setParent(this)
    this.children.splice(index, 0, child)
  }

  replaceChild(index: number, child: WorkspaceNode) {
    child.setParent(this)
    const [oldChild] = this.children.splice(index, 1, child)
    oldChild.setParent(null)
  }

  removeChild(child: WorkspaceNode) {
    const index = this.children.findIndex(c => c === child)
    this.children.splice(index, 1)
    child.setParent(null)
  }
}
