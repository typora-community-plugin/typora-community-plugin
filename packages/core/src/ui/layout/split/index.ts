import './index.scss'
import { WorkspaceParent } from '../workspace-parent'
import type { WorkspaceNode } from '../workspace-node'


export type Direction = 'horizontal' | 'vertical'

export class WorkspaceSplit extends WorkspaceParent {

  type = 'split'

  private sizes: number[] = []

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

  insertChild(index: number, child: WorkspaceNode): void {
    const prevChild = this.children[index - 1] ?? this.children[index]
    const prevSizeIdx = this.children.findIndex(c => c === prevChild)

    super.insertChild(index, child)

    if (this.children.length === 1) {
      this.sizes.push(1)
    }
    else {
      const avgWidth = this.sizes[prevSizeIdx] / 2
      this.sizes[prevSizeIdx] = avgWidth
      this.sizes.splice(index, 0, avgWidth)
    }
    this.updatePaneSizes()
  }

  protected _insertChildEl(index: number, child: WorkspaceNode) {
    this.containerEl.insertBefore(child.containerEl, this.containerEl.children[index + 1])
  }

  removeChild(child: WorkspaceNode) {
    super.removeChild(child)

    const idx = this.children.findIndex(c => c === child)
    const [leftWidth] = this.sizes.splice(idx, 1)

    if (this.children.length) {
      const avgWidth = leftWidth / this.children.length
      this.sizes = this.sizes.map(s => s + avgWidth)
      this.updatePaneSizes()
    }

    if (this.children.length === 1) {
      this.parent?.replaceChild(this, this.children[0])
    }
  }

  onChildResizeStart(child: WorkspaceNode, e: MouseEvent) {
    let dragging = true
    const isVertical = this.direction === 'vertical'
    const splits = this.children
    const idx = splits.findIndex(c => c === child)

    if (idx === 0) return
    const leftIdx = idx - 1

    const containerRect = this.containerEl.getBoundingClientRect()
    const totalPixel = isVertical ? containerRect.width : containerRect.height

    const leftDom = splits[leftIdx].containerEl
    const rightDom = splits[idx].containerEl
    const leftW = isVertical ? leftDom.offsetWidth : leftDom.offsetHeight
    const rightW = isVertical ? rightDom.offsetWidth : rightDom.offsetHeight
    const startPos = isVertical ? e.clientX : e.clientY

    document.onmousemove = (e2) => {
      if (!dragging) return;
      const curPos = isVertical ? e2.clientX : e2.clientY
      const deltaPx = curPos - startPos

      let newLeftPx = Math.max(120, leftW + deltaPx)
      let newRightPx = Math.max(120, rightW - deltaPx)

      if (newLeftPx + newRightPx > totalPixel) {
        newRightPx = totalPixel - newLeftPx
      }

      const newLeftSize = newLeftPx / totalPixel
      const newRightSize = newRightPx / totalPixel

      this.sizes[leftIdx] = newLeftSize
      this.sizes[idx] = newRightSize

      const remain = 1 - (newLeftSize + newRightSize)
      const otherIdx = this.sizes
        .map((v, index) => (index === leftIdx || index === idx ? -1 : index))
        .filter(i => i !== -1)

      if (otherIdx.length > 0) {
        const fact = remain / otherIdx.length
        otherIdx.forEach(i => this.sizes[i] = fact)
      }

      this.updatePaneSizes()
    }

    document.onmouseup = () => {
      dragging = false
      document.onmousemove = document.onmouseup = null
    }
  }

  private updatePaneSizes() {
    this.children.forEach((child, i) => {
      const dom = child.containerEl
      dom.style.flex = "0 0 auto"
      if (this.direction === 'vertical') {
        dom.style.flexBasis = (this.sizes[i] * 100) + "%"
      } else {
        dom.style.flexBasis = (this.sizes[i] * 100) + "%"
      }
    })
  }
}
