import './theme.scss'

/**
 * Default theme for floating views.
 *
 * Applies the 'typ-floating-theme' class which provides fixed positioning,
 * size, background, border and shadow — everything except the view's own
 * content markup. See index.scss for style definitions.
 */
export function defaultTheme(containerEl: HTMLElement) {
  containerEl.classList.add('typ-theme-default')
}

/**
 * Titlebar theme for floating views.
 *
 * Adds a title bar with icon and text at the top, plus a close button.
 * The view's content area sits below the title bar.
 */
export function windowTheme(containerEl: HTMLElement, title?: string) {
  containerEl.classList.add('typ-theme-window')

  const titleBar = document.createElement('div')
  titleBar.className = 'typ-titlebar'

  const iconEl = document.createElement('span')
  iconEl.className = 'typ-titlebar-icon'
  iconEl.innerHTML = '<i class="fa fa-window-maximize"></i>'

  const textEl = document.createElement('span')
  textEl.className = 'typ-titlebar-text'
  textEl.textContent = title || 'Floating View'

  titleBar.appendChild(iconEl)
  titleBar.appendChild(textEl)
  containerEl.prepend(titleBar)
}
