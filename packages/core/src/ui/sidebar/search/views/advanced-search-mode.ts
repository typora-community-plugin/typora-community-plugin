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

  private headerRow!: HTMLElement
  private labelEl!: HTMLElement
  private btnEl!: HTMLElement

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
        _globalSearch.openGlobalSearch(query)
      })
    )

    this._updateButtonState()
  }

  onunload() {
    this.headerRow.remove()
  }

  toggle = () => {
    const settings = useService('settings')
    const currentValue = settings.get(this.SETTING_KEY)
    settings.set(this.SETTING_KEY, !currentValue)
    this._updateButtonState()
  }

  private _isEnabled(): boolean {
    return useService('settings').get(this.SETTING_KEY)
  }

  private _injectButton() {
    const inputEl = document.querySelector('#file-library-search-input')
    if (!inputEl?.parentElement) return

    // Create header row: "Search" on left, toggle button on right
    this.btnEl = html`<button class="ty-plugin-advanced-search-btn">✨</button>`

    this.btnEl.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.toggle()
    })

    this.headerRow = document.createElement('div')
    this.headerRow.className = 'ty-plugin-search-header'

    this.labelEl = document.createElement('span')
    this.labelEl.textContent = 'Search'

    this.headerRow.appendChild(this.labelEl)
    this.headerRow.appendChild(this.btnEl)

    // Insert above the search input
    const panel = document.getElementById('file-library-search-panel')
    if (panel && inputEl) {
      panel.insertBefore(this.headerRow, inputEl)
    }
  }

  private _updateButtonState() {
    const enabled = this._isEnabled()
    const t = this.i18n.t.sidebar.search

    document.body.classList.toggle('ty-advanced-search-active', enabled)

    this.labelEl.textContent = enabled ? t.advancedMode : t.commonMode
    this.labelEl.title = enabled ? t.advancedModeDesc : ''

    this.btnEl.classList.toggle('ty-active', enabled)
    this.btnEl.title = t.advancedMode
  }
}
