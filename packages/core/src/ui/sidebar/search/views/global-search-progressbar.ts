import './global-search-progressbar.scss'
import decorate from '@plylrnsdy/decorate.js'
import { Component } from 'src/common/component'
import { html } from 'src/utils'
import { editor } from 'typora'


export class GlobalSearchProgressbar extends Component {

  private el!: HTMLElement

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
    this.el = html`
      <div class="global-search-progressbar" style="display: none;">
        <div class="global-search-progressbar-inner"></div>
      </div>
    ` as HTMLElement

    const inputEl = document.querySelector('#file-library-search-input') as HTMLElement | null
    if (!inputEl) return

    const resultsEl = document.getElementById('file-library-search-result')
    if (resultsEl) {
      resultsEl.parentNode?.insertBefore(this.el, resultsEl)
    } else {
      inputEl.parentNode?.appendChild(this.el)
    }
  }

  onunload() {
    this.el.remove()
  }

  show() {
    this.el.style.display = 'block'
  }

  hide() {
    this.el.style.display = 'none'
  }
}
