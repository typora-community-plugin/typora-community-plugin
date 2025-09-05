import type { WorkspaceLeaf } from "./workspace-leaf"
import { WorkspaceNode } from "./workspace-node"


export abstract class WorkspaceParent extends WorkspaceNode {

  children: WorkspaceNode[] = []

  isLeaf(): this is WorkspaceLeaf {
    return false
  }

  // --------- Child Node Operators ---------

  appendChild(child: WorkspaceNode) {
    this.insertChild(this.children.length, child)
  }

  insertBefore(child: WorkspaceNode) {
    const index = this.children.findIndex(c => c === child)
    this.insertChild(index, child)
  }

  insertChild(index: number, child: WorkspaceNode) {
    this._insertChild(index, child)
    this.getRoot().emit('layout-changed')
  }

  protected _insertChild(index: number, child: WorkspaceNode) {
    this.children.splice(index, 0, child)
    child.setParent(this)
    this._insertChildEl(index, child)
  }

  protected abstract _insertChildEl(index: number, child: WorkspaceNode): void

  replaceChild(oldChild: WorkspaceNode, newChild: WorkspaceNode) {
    const index = this.children.findIndex(c => c === oldChild)
    this._removeChild(oldChild)
    this._insertChild(index, newChild)
    this.getRoot().emit('layout-changed')
  }

  removeChild(child: WorkspaceNode) {
    this._removeChild(child)
    this.getRoot().emit('layout-changed')
  }

  protected _removeChild(child: WorkspaceNode) {
    const index = this.children.findIndex(c => c === child)
    this.children.splice(index, 1)
    child.setParent(null)
    child.containerEl.remove()
  }

  // --------- Iteration Operators ---------

  eachNodes(iteratee: (node: WorkspaceNode) => boolean | void) {
    const nodes = this.children
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (iteratee(node)) break
      if (node.type !== 'leaf') {
        (node as WorkspaceParent).eachNodes(iteratee)
      }
    }
  }

  findNode<R extends WorkspaceNode = WorkspaceNode>(iteratee: (node: WorkspaceNode) => boolean): R {
    let res: WorkspaceNode
    this.eachNodes(node => {
      if (iteratee(node)) {
        res = node
        return true
      }
    })
    return res as R
  }

  filterNodes<R extends WorkspaceNode = WorkspaceNode>(iteratee: (node: WorkspaceNode) => boolean): R[] {
    const res: WorkspaceNode[] = []
    this.eachNodes(node => {
      if (iteratee(node)) res.push(node)
    })
    return res as R[]
  }

  eachLeaves(iteratee: (leaf: WorkspaceLeaf) => boolean | void) {
    const nodes = this.children
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (node.type === 'leaf') {
        if (iteratee(node as WorkspaceLeaf)) break
      } else {
        (node as WorkspaceParent).eachLeaves(iteratee)
      }
    }
  }

  findLeaf<L extends WorkspaceLeaf = WorkspaceLeaf>(iteratee: (leaf: WorkspaceLeaf) => boolean): L {
    let res: WorkspaceLeaf
    this.eachLeaves(leaf => {
      if (iteratee(leaf)) {
        res = leaf
        return true
      }
    })
    return res as L
  }

  filterLeaves<L extends WorkspaceLeaf = WorkspaceLeaf>(iteratee: (leaf: WorkspaceLeaf) => boolean): L[] {
    const res: WorkspaceLeaf[] = []
    this.eachLeaves(leaf => {
      if (iteratee(leaf)) res.push(leaf)
    })
    return res as L[]
  }

  toJSON() {
    return {
      type: this.type,
      children: this.children.map(c => c.toJSON()),
    }
  }
}
