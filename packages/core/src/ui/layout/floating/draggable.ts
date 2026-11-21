import { beginDrag } from 'src/utils/pointer/drag'
import type { DisposeFunc } from "src/utils/types"

/**
 * Make a floating view draggable.
 *
 * Attaches a mousedown listener to the container (or `handleEl`) so it can
 * be moved around by dragging (position is kept as `left`/`top`). The
 * optional `handleEl` restricts dragging to that element only — useful when
 * the view also contains interactive content. Returns a dispose function
 * that removes all listeners (safe to call multiple times).
 */
export function draggable(
  containerEl: HTMLElement,
  handleEl?: Element | null,
): DisposeFunc {
  const handle = handleEl ?? containerEl

  const onHandleMouseDown = (e: MouseEvent) => {
    // ignore right-clicks and clicks on resize handles etc. that stop propagation
    if (e.button !== 0) return
    const rect = containerEl.getBoundingClientRect()
    const startLeft = rect.left
    const startTop = rect.top

    // switch to left/top positioning so movement is deterministic
    if (!containerEl.style.position || !['fixed', 'absolute'].includes(containerEl.style.position)) {
      containerEl.style.position = 'fixed'
    }
    containerEl.style.left = `${rect.left}px`
    containerEl.style.top = `${rect.top}px`
    // clear right/bottom so they do not fight with left/top
    containerEl.style.right = ''
    containerEl.style.bottom = ''

    beginDrag(e, {
      onMove: (_e, { dx, dy }) => {
        containerEl.style.left = `${startLeft + dx}px`
        containerEl.style.top = `${startTop + dy}px`
      },
    })
  }

  handle.addEventListener('mousedown', onHandleMouseDown as EventListener)

  return () => {
    handle.removeEventListener('mousedown', onHandleMouseDown as EventListener)
  }
}
