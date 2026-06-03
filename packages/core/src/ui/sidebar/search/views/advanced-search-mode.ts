import './advanced-search-mode.scss'
import decorate from '@plylrnsdy/decorate.js'
import { Component } from 'src/common/component'
import { html } from 'src/utils'
import { editor } from 'typora'
import { useService } from 'src/common/service'


/**
 * Advanced Search Mode — replaces Typora's native file search with the custom
 * ripgrep-based engine (GlobalSearch.openGlobalSearch).
 *
 * When enabled:
 * 1. A toggle button is injected into the search toolbar (next to the regex button)
 * 2. `editor.library.fileSearch.search()` is decorated to call `openGlobalSearch()` instead
 */
export class AdvancedSearchMode extends Component {

  private SETTING_KEY = 'advancedSearchMode' as const

  /** Reference to the injected toggle button element */
  private btnEl!: HTMLButtonElement

  /** Reference to the header row container */
  private headerRow!: HTMLElement

  constructor(
    private i18n = useService('i18n'),
    settings = useService('settings'),
  ) {
    super()

    // Always load: inject the button and decorate search.
    // The button visibility is managed independently of the setting.
    this.load()

    settings.onChange(this.SETTING_KEY, () => {
      this._updateButtonState()
    })
  }

  onload() {
    const _globalSearch = useService('app').features.globalSearch

    // Inject toggle button into the search toolbar (once)
    this._injectButton()

    // Decorate fileSearch.search() to route through our custom engine
    this.register(
      decorate(editor.library.fileSearch, 'search', fn => (query: string) => {
        if (!this._isEnabled()) return fn(query)
        _globalSearch.openGlobalSearch(query)
      })
    )

    // Update button visual state to match current setting
    this._updateButtonState()
  }

  onunload() {
    this.headerRow.remove()
  }

  /** Toggle the mode on/off */
  toggle = () => {
    const settings = useService('settings')
    const currentValue = settings.get(this.SETTING_KEY)
    settings.set(this.SETTING_KEY, !currentValue)
    this._updateButtonState()
  }

  private _isEnabled(): boolean {
    return useService('settings').get(this.SETTING_KEY)
  }

  /** Inject a toggle button into the search toolbar */
  private _injectButton() {
    const inputEl = document.querySelector('#file-library-search-input') as HTMLElement | null
    if (!inputEl?.parentElement) return

    // Create header row: "Search" on left, toggle button on right
    this.btnEl = html`<button class="ty-plugin-advanced-search-btn">✨</button>` as HTMLButtonElement

    this.btnEl.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.toggle()
    })

    this.headerRow = document.createElement('div')
    this.headerRow.className = 'ty-plugin-search-header'
    this.headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;'

    const label = document.createElement('span')
    label.textContent = 'Search'
    label.style.cssText = 'font-size: 12px; color: #888; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;'

    this.headerRow.appendChild(label)
    this.headerRow.appendChild(this.btnEl)

    // Insert above the search input
    const panel = document.getElementById('file-library-search-panel') as HTMLElement | null
    if (panel && inputEl) {
      panel.insertBefore(this.headerRow, inputEl)
    }
  }

  /** Update button visual state based on current setting value */
  private _updateButtonState() {
    const enabled = this._isEnabled()

    document.body.classList.toggle('ty-advanced-search-active', enabled)

    this.btnEl.classList.toggle('ty-active', enabled)

    // Update tooltip (i18n resolved at call time for live language support)
    const t = this.i18n.t.settingTabs.appearance
    this.btnEl.title = enabled
      ? `${t.advancedSearchMode} ✓`
      : t.advancedSearchMode
  }
}
