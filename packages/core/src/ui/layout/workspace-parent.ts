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

  insertBefore(child: WorkspaceNode) {
    const index = this.children.findIndex(c => c === child)
    this.insertChild(index, child)
  }

  insertChild(index: number, child: WorkspaceNode) {
    this.children.splice(index, 0, child)
    child.setParent(this)
    this.insertChildEl(index, child)
  }

  protected abstract insertChildEl(index: number, child: WorkspaceNode): void

  replaceChild(oldChild: WorkspaceNode, newChild: WorkspaceNode) {
    const index = this.children.findIndex(c => c === oldChild)
    this.removeChild(oldChild)
    this.insertChild(index, newChild)
  }

  removeChild(child: WorkspaceNode) {
    const index = this.children.findIndex(c => c === child)
    this.children.splice(index, 1)
    child.setParent(null)
    child.containerEl.remove()
  }

  toJSON() {
    return {
      type: this.type,
      children: this.children.map(c => c.toJSON()),
    }
  }
}
