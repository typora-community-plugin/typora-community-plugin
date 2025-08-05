import type { WorkspaceTabs } from "."
import type { WorkspaceRoot } from "../workspace-root"


export function draggable(root: WorkspaceRoot) {

  const rootEl = root.containerEl
  let draggedStartTime = Number.MAX_SAFE_INTEGER
  let draggingTabEl: HTMLElement

  rootEl.addEventListener('mousedown', onDragStart)

  function onDragStart(e: MouseEvent) {
    if (e.button !== 0) return

    const draggableEl = $(e.target).closest('[draggable=true]')[0]
    if (!draggableEl) return
    e.preventDefault()
    draggedStartTime = Date.now()
    draggingTabEl = $(draggableEl).closest('.typ-tab')[0]

    rootEl.addEventListener('mousemove', onDragOver)
    rootEl.addEventListener('mouseup', onDrop)
  }

  function onDragOver(e: MouseEvent) {
    if (!draggingTabEl) return
    if (Date.now() - draggedStartTime <= 300) return
    $('.mod-drag-over').removeClass('mod-drag-over')
    $(e.target).closest('.typ-workspace-tabs').addClass('mod-drag-over')
  }

  function onDrop(e: MouseEvent) {
    if (!draggingTabEl) return
    $('.mod-drag-over').removeClass('mod-drag-over')

    const draggingLeaf = root.findLeaf(root, leaf => leaf.state.path === draggingTabEl.dataset.id)
    const dragOverEl = $(e.target).closest('.typ-workspace-tabs')[0]
    const dragOverTabs = root.findNode(root, node => node.containerEl === dragOverEl) as WorkspaceTabs

    if (draggingLeaf.parent !== dragOverTabs) {
      draggingLeaf.detach()
      setTimeout(() => dragOverTabs.appendChild(draggingLeaf))
    }

    draggedStartTime = Number.MAX_SAFE_INTEGER
    draggingTabEl = null
    rootEl.removeEventListener('mousemove', onDragOver)
    rootEl.removeEventListener('mouseup', onDrop)
  }

  return () => {
    rootEl.removeEventListener("mousedown", onDragStart)
  }
}
