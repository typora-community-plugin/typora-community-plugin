import type { DisposeFunc } from "src/utils/types"

/**
 * Add a close button to a floating view.
 *
 * Appends an X button to the container, positioned top-right. Clicking it
 * triggers `onClose` and optionally removes the element. Returns a dispose
 * function that cleans up the handler (the handle itself is not removed —
 * callers should do that if needed).
 */
export function closable(
  containerEl: HTMLElement,
  onClose: () => void,
): DisposeFunc {
  const closeBtn = document.createElement('div')
  closeBtn.className = 'typ-floating-close'
  closeBtn.className = 'typ-floating-close'
  closeBtn.innerHTML = `<i class="typ-icon typ-close"></i>`

  function onClick(e: MouseEvent) {
    e.stopPropagation()
    onClose()
  }

  closeBtn.addEventListener('click', onClick)
  containerEl.appendChild(closeBtn)

  return () => {
    closeBtn.removeEventListener('click', onClick)
  }
}
