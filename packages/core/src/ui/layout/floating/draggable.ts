import type { DisposeFunc } from "src/utils/types"

/**
 * Make a floating view draggable.
 *
 * Attaches mousedown/mousemove listeners to the container so it can be moved
 * around by dragging (position is kept as `left`/`top`). The optional
 * `handleEl` restricts dragging to that element only — useful when the view
 * also contains interactive content. Returns a dispose function that removes
 * all listeners (safe to call multiple times).
 */
export function draggable(
  containerEl: HTMLElement,
  handleEl?: Element | null,
): DisposeFunc {
  const handle = handleEl ?? containerEl

  let startX = 0
  let startY = 0
  let startLeft = 0
  let startTop = 0

  function onMouseMove(e: MouseEvent) {
    containerEl.style.left = `${startLeft + e.clientX - startX}px`
    containerEl.style.top = `${startTop + e.clientY - startY}px`
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  function onHandleMouseDown(e: MouseEvent) {
    // ignore right-clicks and clicks on resize handles etc. that stop propagation
    if (e.button !== 0) return
    const rect = containerEl.getBoundingClientRect()
    startX = e.clientX
    startY = e.clientY
    startLeft = rect.left
    startTop = rect.top

    // switch to left/top positioning so movement is deterministic
    if (!containerEl.style.position || !['fixed', 'absolute'].includes(containerEl.style.position)) {
      containerEl.style.position = 'fixed'
    }
    containerEl.style.left = `${rect.left}px`
    containerEl.style.top = `${rect.top}px`
    // clear right/bottom so they do not fight with left/top
    containerEl.style.right = ''
    containerEl.style.bottom = ''

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  handle.addEventListener('mousedown', onHandleMouseDown as EventListener)

  return () => {
    handle.removeEventListener('mousedown', onHandleMouseDown as EventListener)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
}
