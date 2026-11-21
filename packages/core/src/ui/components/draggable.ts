import './draggable.scss'
import { beginDrag } from 'src/utils/pointer/drag'
import type { DisposeFunc } from 'src/utils/types'


const compare = {
  x(event: MouseEvent, dropEl: HTMLElement) {
    const container = dropEl.offsetParent! as HTMLElement
    return event.clientX - container.offsetLeft <= dropEl.offsetLeft + dropEl.offsetWidth / 2
  },
  y(event: MouseEvent, dropEl: HTMLElement) {
    const container = dropEl.offsetParent! as HTMLElement
    return event.clientY - container.offsetTop <= dropEl.offsetTop + dropEl.offsetHeight / 2
  }
}

/**
 * Make children of a container reorderable by drag-and-drop.
 *
 * Elements marked with `[draggable=true]` can be dragged past each other;
 * the drop position is decided by which half of the hovered element the
 * pointer is over, along `direction`. Returns a dispose function that
 * removes the listeners.
 */
export function draggable(
  containerEl: HTMLElement,
  direction: keyof typeof compare,
  onChange?: () => void
): DisposeFunc {

  const onDragStart = (event: MouseEvent) => {
    if (event.button !== 0) return
    const draggingEl = (event.target as HTMLElement).closest<HTMLElement>('[draggable=true]')
    if (!draggingEl) return
    draggingEl.classList.add('typ-dragging')

    beginDrag(event, {
      onMove: (e) => {
        const dropEl = (e.target as HTMLElement | null)?.closest<HTMLElement>('[draggable=true]')
        if (!dropEl || dropEl === draggingEl || !containerEl.contains(dropEl)) return
        const pos = compare[direction](e, dropEl) ? 'beforebegin' : 'afterend'
        dropEl.insertAdjacentElement(pos, draggingEl)
        dropEl.style.cssText = ''
      },
      onEnd: () => {
        draggingEl.classList.remove('typ-dragging')
        onChange?.()
      },
    })
  }

  containerEl.addEventListener('mousedown', onDragStart as EventListener)

  return () => {
    containerEl.removeEventListener('mousedown', onDragStart as EventListener)
  }
}
