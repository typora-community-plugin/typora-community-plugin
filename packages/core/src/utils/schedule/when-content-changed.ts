export function whenContentChanged(el: HTMLElement, snapshot: string): Promise<void> {
  return new Promise(resolve => {
    if (el.innerHTML !== snapshot) {
      resolve()
      return
    }
    const observer = new MutationObserver(() => {
      if (el.innerHTML !== snapshot) {
        observer.disconnect()
        resolve()
      }
    })
    observer.observe(el, { childList: true, subtree: true, characterData: true })
    setTimeout(() => { observer.disconnect(); resolve() }, 8000)
  })
}
