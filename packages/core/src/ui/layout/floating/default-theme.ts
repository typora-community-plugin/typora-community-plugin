/**
 * Default theme for floating views.
 *
 * Applies the non-content styles extracted from `index-test.ts` to a floating
 * view's container: fixed positioning, size, background, border and shadow —
 * everything except the view's own content markup.
 */
export function defaultTheme(containerEl: HTMLElement) {
  Object.assign(containerEl.style, {
    position: 'fixed',
    top: '80px',
    right: '24px',
    zIndex: '1000',
    width: '320px',
    padding: '12px 16px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 6px 16px rgba(0, 0, 0, .15)',
    fontSize: '13px',
  } satisfies Partial<CSSStyleDeclaration>)
}

