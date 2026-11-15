import './global-search-progressbar.scss'
import decorate from '@plylrnsdy/decorate.js'
import { Component } from 'src/common/component'
import { html } from 'src/utils'
import { editor } from 'typora'


export class GlobalSearchProgressbar extends Component {

  private el: HTMLElement | undefined

  constructor() {
    super()

    decorate.afterCall(editor.library.fileSearch, 'onSearchUpdate', ([s], results) => {
      this.show()
      if (s === '' && editor.library.fileSearch.endCount === 0) {
        this.hide()
      }
    })
  }

  onload() {
    this._mount()
  }

  onunload() {
    this.el?.remove()
    this.el = undefined
  }

  /**
   * Create and insert the progress bar element. Idempotent, and can be
   * retried later if the search panel was not in the DOM yet when `onload`
   * ran (e.g. the search panel is opened through Typora's native search
   * button instead of the ribbon button).
   */
  private _mount() {
    if (this.el) return

    const inputEl = document.querySelector('#file-library-search-input') as HTMLElement | null
    if (!inputEl?.parentNode) return

    const el = html`
      <div class="typ-global-search-progressbar" style="display: none;">
        <div class="typ-global-search-progressbar-inner"></div>
      </div>
    ` as HTMLElement

    const resultsEl = document.getElementById('file-library-search-result')
    if (resultsEl?.parentNode) {
      resultsEl.parentNode.insertBefore(el, resultsEl)
    } else {
      inputEl.parentNode.appendChild(el)
    }

    this.el = el
  }

  show() {
    // `show()` may be called before `GlobalSearchView.onshow()` has run,
    // so make sure the element exists instead of assuming `el` is mounted.
    this._mount()
    if (!this.el) return
    this.el.style.display = 'block'
  }

  hide() {
    if (!this.el) return
    this.el.style.display = 'none'
  }
}
