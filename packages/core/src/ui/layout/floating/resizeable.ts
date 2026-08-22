import type { DisposeFunc } from "src/utils/types"

/**
 * Make a floating view resizable.
 *
 * Appends a bottom-right resize handle to the container and updates its
 * width/height while dragging. Returns a dispose function that removes the
 * handle and all listeners (safe to call multiple times).
 */
export function resizeable(
  containerEl: HTMLElement,
  options?: { minWidth?: number; minHeight?: number },
): DisposeFunc {
  const minWidth = options?.minWidth ?? 120
  const minHeight = options?.minHeight ?? 80

  const handle = document.createElement('div')
  handle.className = 'typ-floating-resize-handle'
  Object.assign(handle.style, {
    position: 'absolute',
    right: '0',
    bottom: '0',
    width: '12px',
    height: '12px',
    cursor: 'nwse-resize',
    zIndex: '1',
  })

  // ensure the container can host an absolute handle without changing layout
  const prevPosition = getComputedStyle(containerEl).position
  if (!['absolute', 'fixed'].includes(prevPosition)) {
    containerEl.style.position = 'relative'
  }

  let startX = 0
  let startY = 0
  let startWidth = 0
  let startHeight = 0

  function onMouseMove(e: MouseEvent) {
    const width = Math.max(minWidth, startWidth + e.clientX - startX)
    const height = Math.max(minHeight, startHeight + e.clientY - startY)
    containerEl.style.width = `${width}px`
    containerEl.style.height = `${height}px`
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  function onHandleMouseDown(e: MouseEvent) {
    e.stopPropagation()
    startX = e.clientX
    startY = e.clientY
    startWidth = containerEl.offsetWidth
    startHeight = containerEl.offsetHeight
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  handle.addEventListener('mousedown', onHandleMouseDown)
  containerEl.appendChild(handle)

  return () => {
    handle.removeEventListener('mousedown', onHandleMouseDown)
    handle.remove()
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
}
