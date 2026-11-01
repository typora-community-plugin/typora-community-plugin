/**
 * Whether the element is the CodeMirror editor used by Typora for code fences
 * and source mode.
 */
export function isCodeEditor(el: Element | null): boolean {
  return !!el
    && el.tagName === 'TEXTAREA'
    && !!el.closest('.CodeMirror')
}
