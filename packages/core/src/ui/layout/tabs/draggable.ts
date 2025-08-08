import type { WorkspaceTabs } from "."
import type { WorkspaceRoot } from "../workspace-root"


export function draggableTabs(root: WorkspaceRoot) {

  const rootEl = root.containerEl

  let startX = 0
  let startY = 0
  let isMouseDown = false
  let draggingTabEl: HTMLElement

  rootEl.addEventListener('mousedown', onDragStart)

  function onDragStart(e: MouseEvent) {
    if (e.button !== 0) return

    const draggableEl = $(e.target).closest('[draggable=true]')[0]
    if (!draggableEl) return
    e.preventDefault()

    startX = e.clientX
    startY = e.clientY
    isMouseDown = true
    draggingTabEl = $(draggableEl).closest('.typ-tab')[0]

    rootEl.addEventListener('mousemove', onDragOver)
    rootEl.addEventListener('mouseup', onDrop)
  }

  function onDragOver(e: MouseEvent) {
    if (!isMouseDown) return
    if (moveLessThan9px(e.clientX, e.clientY)) return

    $('.mod-drag-over').removeClass('mod-drag-over')

    const $tabEl = $(e.target).closest('.typ-tab')
    if ($tabEl)
      $tabEl.addClass('mod-drag-over')
    else
      $(e.target).closest('.typ-workspace-tabs').addClass('mod-drag-over')
  }

  function onDrop(e: MouseEvent) {
    isMouseDown = false
    rootEl.removeEventListener('mousemove', onDragOver)
    rootEl.removeEventListener('mouseup', onDrop)

    if (moveLessThan9px(e.clientX, e.clientY)) {
      draggingTabEl = null
    }
    if (!draggingTabEl) return

    $('.mod-drag-over').removeClass('mod-drag-over')

    const draggingLeaf = root.findLeaf(leaf => leaf.state.path === draggingTabEl.dataset.id)
    const dragOverTabEl = $(e.target).closest('.typ-tab')[0]
    const dragOverTabsEl = $(e.target).closest('.typ-workspace-tabs')[0]
    const dragOverTabs = root.findNode(node => node.containerEl === dragOverTabsEl) as WorkspaceTabs
    const isDroppingInOriginalTabs = draggingLeaf.parent === dragOverTabs

    if (isDroppingInOriginalTabs) {
      if (dragOverTabEl) {
        dragOverTabEl.parentElement.insertBefore(draggingTabEl, dragOverTabEl)
      }
    }
    else {
      const i = dragOverTabEl
        ? Array.from(dragOverTabEl.parentElement.children).findIndex(el => el === dragOverTabEl)
        : dragOverTabs.children.length
      draggingLeaf.detach()
      setTimeout(() => dragOverTabs.insertChild(i, draggingLeaf))
    }

    draggingTabEl = null
  }

  function moveLessThan9px(currentX: number, currentY: number) {
    return Math.abs(startX - currentX) < 9 && Math.abs(startY - currentY) < 9
  }

  return () => {
    rootEl.removeEventListener("mousedown", onDragStart)
  }
}
