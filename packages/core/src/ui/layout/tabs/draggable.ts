import { useService } from "src/common/service"
import { beginDrag } from 'src/utils/pointer/drag'
import type { DisposeFunc } from 'src/utils/types'
import type { WorkspaceRoot } from "../workspace-root"
import type { WorkspaceTabs } from "."


/**
 * Reorder workspace tabs by dragging, and move tabs across tab strips.
 *
 * A drag only starts after the pointer travels 9px, so plain clicks on tabs
 * are not captured. Returns a dispose function that removes the listeners.
 */
export function draggableTabs(root: WorkspaceRoot, workspace = useService('workspace')): DisposeFunc {

  const rootEl = root.containerEl

  const onDragStart = (e: MouseEvent) => {
    const draggableEl = $(e.target!).closest('[draggable=true]')[0]
    if (!draggableEl) return
    const draggingTabEl = $(draggableEl).closest('.typ-tab')[0]

    beginDrag(e, {
      threshold: 9,
      onMove: (e) => {
        $('.mod-drag-over').removeClass('mod-drag-over')
        const $target = $(e.target!)
        const $tabEl = $target.closest('.typ-tab')
        if ($tabEl.length)
          $tabEl.addClass('mod-drag-over')
        else
          $target.closest('.typ-workspace-tabs').addClass('mod-drag-over')
      },
      onEnd: (e, { moved }) => {
        $('.mod-drag-over').removeClass('mod-drag-over')
        // pointer released before the drag threshold — plain click, not a drop
        if (!e || !moved) return

        const draggingLeaf = root.findLeaf(leaf => leaf.state.path === draggingTabEl!.dataset.id)!
        const dragOverTabEl = $(e.target!).closest('.typ-tab')[0]
        const dragOverTabsEl = $(e.target!).closest('.typ-workspace-tabs')[0]
        const dragOverTabs = root.findNode(node => node.containerEl === dragOverTabsEl) as WorkspaceTabs
        if (!dragOverTabs) return
        const isDroppingInOriginalTabs = draggingLeaf.parent === dragOverTabs

        if (isDroppingInOriginalTabs) {
          if (dragOverTabEl) {
            dragOverTabEl.parentElement!.insertBefore(draggingTabEl, dragOverTabEl)
          }
        }
        else {
          const i = dragOverTabEl
            ? Array.from(dragOverTabEl.parentElement!.children).findIndex(el => el === dragOverTabEl)
            : dragOverTabs.children.length
          draggingLeaf.detach()
          dragOverTabs.insertChild(i, draggingLeaf)
          setTimeout(() => {
            workspace.activeLeaf = draggingLeaf
          })
        }
      },
    })
  }

  rootEl.addEventListener('mousedown', onDragStart as EventListener)

  return () => {
    rootEl.removeEventListener("mousedown", onDragStart as EventListener)
  }
}
