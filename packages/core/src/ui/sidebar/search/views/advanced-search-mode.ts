import './advanced-search-mode.scss'
import decorate from '@plylrnsdy/decorate.js'
import { Component } from 'src/common/component'
import { useService } from 'src/common/service'
import { html } from 'src/utils'
import { editor } from 'typora'


/**
 * Advanced Search Mode — replaces Typora's native file search with the custom
 * ripgrep-based engine (GlobalSearch.openAdvancedSearch).
 *
 * When enabled:
 * 1. A toggle button is injected into the search toolbar (next to the regex button)
 * 2. `editor.library.fileSearch.search()` is decorated to call `openAdvancedSearch()` instead
 */
export class AdvancedSearchMode extends Component {

  private SETTING_KEY = 'advancedSearchMode' as const

  private headerRow?: HTMLElement
  private labelEl?: HTMLElement
  private btnEl?: HTMLElement

  constructor(
    private i18n = useService('i18n'),
    settings = useService('settings'),
  ) {
    super()

    this.load()

    settings.onChange(this.SETTING_KEY, () => {
      this._updateButtonState()
    })
  }

  onload() {
    const _globalSearch = useService('app').features.globalSearch

    this._injectButton()

    this.register(
      decorate(editor.library.fileSearch, 'search', fn => (query: string) => {
        if (!this._isEnabled()) return fn(query)
        _globalSearch.openAdvancedSearch(query)
      })
    )

    this._updateButtonState()
  }

  onunload() {
    this.headerRow?.remove()
    this.headerRow = undefined
    this.labelEl = undefined
    this.btnEl = undefined
  }

  toggle = () => {
    const settings = useService('settings')
    const currentValue = settings.get(this.SETTING_KEY)
    const enabled = !currentValue
    settings.set(this.SETTING_KEY, enabled)
    this._updateButtonState()

    // Leaving advanced mode: the native engine renders into the same panel,
    // so cancel any in-flight advanced search and clear its results to avoid
    // stale hits surviving into the next native search.
    if (!enabled) {
      useService('app').features.globalSearch.cancelSearch()
    }
  }

  private _isEnabled(): boolean {
    return useService('settings').get(this.SETTING_KEY)
  }

  private _injectButton() {
    const inputEl = document.querySelector('#file-library-search-input') as HTMLElement | null
    if (!inputEl?.parentElement) return

    // Create header row: "Search" on left, toggle button on right
    const btnEl = html`<button class="ty-plugin-advanced-search-btn">✨</button>`

    btnEl.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.toggle()
    })

    const headerRow = document.createElement('div')
    headerRow.className = 'ty-plugin-search-header'

    const labelEl = document.createElement('span')
    labelEl.textContent = 'Search'

    headerRow.appendChild(labelEl)
    headerRow.appendChild(btnEl)

    // Insert above the search input
    inputEl.parentElement.insertBefore(headerRow, inputEl)

    this.headerRow = headerRow
    this.labelEl = labelEl
    this.btnEl = btnEl
  }

  private _updateButtonState() {
    const enabled = this._isEnabled()
    const t = this.i18n.t.sidebar.search

    document.body.classList.toggle('ty-advanced-search-active', enabled)

    // The search panel may not be in the DOM yet, so the header row might
    // not have been injected. Keep this method safe to call at any time.
    if (this.labelEl) {
      this.labelEl.textContent = enabled ? t.advancedMode : t.commonMode
      this.labelEl.title = enabled ? t.advancedModeDesc : ''
    }

    if (this.btnEl) {
      this.btnEl.classList.toggle('ty-active', enabled)
      this.btnEl.title = t.advancedMode
    }
  }
}
