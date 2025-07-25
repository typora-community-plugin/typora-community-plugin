import './workspace-node.scss'
import { Events } from "src/common/events"
import { useService } from 'src/common/service'
import type { WorkspaceParent } from "./workspace-parent"
import type { WorkspaceLeaf } from "./workspace-leaf"
import type { WorkspaceSplit } from './split'


export abstract class WorkspaceNode extends Events<any> {

  abstract type: string
  parent: WorkspaceParent
  containerEl: HTMLElement
  resizeHandleEl: HTMLElement

  constructor() {
    super()
    this.containerEl = $('<div class="typ-workspace-node">')
      .append(this.resizeHandleEl = $('<hr class="typ-workspace-leaf-resize-handle">')
        .on('mousedown', e => this.onResizeStart(e.originalEvent as MouseEvent))[0])[0]
  }

  abstract isLeaf(): this is WorkspaceLeaf

  closest(type: string) {
    let node = this as WorkspaceNode
    while (node != null && node.type !== type) node = node.parent
    return node
  }

  setParent(parent: WorkspaceParent) {
    this.parent = parent
  }

  getRoot() {
    return useService('workspace').rootSplit
  }

  detach() {
    this.parent?.removeChild(this)
  }

  onResizeStart(event: MouseEvent): any {
    if (event.button === 0 && this.parent.type === 'split') {
      (this.parent as WorkspaceSplit).onChildResizeStart(this, event)
    }
  }

  abstract toJSON(): any
}
