import { beginDrag } from 'src/utils/pointer/drag'
import type { DisposeFunc } from "src/utils/types"

/**
 * Make a floating view resizable.
 *
 * Appends a bottom-right resize handle to the container and updates its
 * width/height while dragging. Returns a dispose function that removes the
 * handle and all listeners (safe to call multiple times).
 */
export function resizable(
  containerEl: HTMLElement,
  options?: { minWidth?: number; minHeight?: number },
): DisposeFunc {
  const minWidth = options?.minWidth ?? 120
  const minHeight = options?.minHeight ?? 80

  const handle = document.createElement('div')
  handle.className = 'typ-floating-resize-handle'

  // ensure the container can host an absolute handle without changing layout
  const prevPosition = getComputedStyle(containerEl).position
  if (!['absolute', 'fixed'].includes(prevPosition)) {
    containerEl.style.position = 'relative'
  }

  const onHandleMouseDown = (e: MouseEvent) => {
    e.stopPropagation()
    const startWidth = containerEl.offsetWidth
    const startHeight = containerEl.offsetHeight

    beginDrag(e, {
      onMove: (_e, { dx, dy }) => {
        containerEl.style.width = `${Math.max(minWidth, startWidth + dx)}px`
        containerEl.style.height = `${Math.max(minHeight, startHeight + dy)}px`
      },
    })
  }

  handle.addEventListener('mousedown', onHandleMouseDown as EventListener)
  containerEl.appendChild(handle)

  return () => {
    handle.removeEventListener('mousedown', onHandleMouseDown as EventListener)
    handle.remove()
  }
}
