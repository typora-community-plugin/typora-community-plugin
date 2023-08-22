import './draggable.scss'


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

export function draggable(
  containerEl: HTMLElement,
  direction: keyof typeof compare,
  onChange?: () => void
) {

  let draggingEl: HTMLElement | null

  containerEl.addEventListener('mousedown', event => {
    event.preventDefault()
    const el = event.target as HTMLElement
    draggingEl = el.closest('[draggable=true]')
    draggingEl?.classList.add('typ-dragging')
  })

  containerEl.addEventListener('mousemove', event => {
    const el = event.target as HTMLElement
    const dropEl = el.closest<HTMLElement>('[draggable=true]')
    if (draggingEl && dropEl && dropEl !== draggingEl) {
      const pos = compare[direction](event, dropEl) ? 'beforebegin' : 'afterend'
      dropEl.insertAdjacentElement(pos, draggingEl)
      dropEl.style.cssText = ''
    }
  })

  containerEl.addEventListener('mouseup', () => {
    onChange?.()
    draggingEl?.classList.remove('typ-dragging')
    draggingEl = null
  })
}
