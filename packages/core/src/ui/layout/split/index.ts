import './index.scss'
import { WorkspaceParent } from '../workspace-parent'
import type { WorkspaceNode } from '../workspace-node'


export type Direction = 'horizontal' | 'vertical'

export class WorkspaceSplit extends WorkspaceParent {

  type = 'split'

  constructor(public direction: Direction) {
    super()

    $(this.containerEl).addClass('typ-workspace-split')
    this.setDirection(direction)
  }

  setDirection(direction: Direction) {
    this.direction = direction
    $(this.containerEl)
      .removeClass(['mod-horizontal', 'mod-vertical'])
      .addClass(`mod-${direction}`)
  }

  protected _insertChildEl(index: number, child: WorkspaceNode) {
    this.containerEl.insertBefore(child.containerEl, this.containerEl.children[index + 1])
  }

  protected _removeChild(child: WorkspaceNode) {
    super._removeChild(child)

    if (this.children.length === 1) {
      this.parent?.replaceChild(this, this.children[0])
    }
  }

  onChildResizeStart(child: WorkspaceNode, e: MouseEvent) {
    let dragging = true
    const startPos = this.direction === 'vertical' ? e.clientX : e.clientY
    const splits = this.children
    const rightIdx = this.children.findIndex(c => c === child)
    const leftIdx = rightIdx - 1
    const leftDom = splits[leftIdx].containerEl
    const rightDom = splits[rightIdx].containerEl
    const startLeftW = this.direction === 'vertical' ? leftDom.offsetWidth : leftDom.offsetHeight
    const startRightW = this.direction === 'vertical' ? rightDom.offsetWidth : rightDom.offsetHeight
    document.onmousemove = (e2) => {
      if (!dragging) return
      const curPos = this.direction === 'vertical' ? e2.clientX : e2.clientY
      const delta = curPos - startPos
      const newLeft = Math.max(120, startLeftW + delta)
      const newRight = Math.max(120, startRightW - delta)
      leftDom.style.flex = 'unset'
      rightDom.style.flex = 'unset'
      if (this.direction === 'vertical') {
        leftDom.style.width = newLeft + "px"
        rightDom.style.width = newRight + "px"
      } else {
        leftDom.style.height = newLeft + "px"
        rightDom.style.height = newRight + "px"
      }
    }
    document.onmouseup = () => {
      dragging = false
      document.onmousemove = document.onmouseup = null
    }
  }
}
