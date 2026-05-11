import decorate from '@plylrnsdy/decorate.js'
import { editor } from "typora"
import path from 'src/path'
import { Component } from 'src/common/component'
import { BUILT_IN } from "src/ui/ribbon/workspace-ribbon"
import { html, noop } from 'src/utils'
import { useService } from 'src/common/service'
import { InternalSidebarPanel } from '../sidebar-panel'
import type { SearchResult } from './ripgrep-search-service'


const SELECTOR_QUERY_INPUT = '#file-library-search-input'
const SELECTOR_RESULTS = '#file-library-search-result'

/** Separator character for path parts in parent-loc display */
const PATH_SEP = " / "


export class GlobalSearchView extends InternalSidebarPanel {

  static get id() {
    return 'core.search' as const
  }

  private _keepSearchResult = new KeepSearchResult()
  private _showSearchResultFullPath = new ShowSearchResultFullPath()
  /** Whether case-sensitive search is enabled */
  private _caseSensitive = false
  /** Whether whole-word search is enabled */
  private _wholeWord = false

  constructor(
    i18n = useService('i18n'),
    settings = useService('settings'),
  ) {
    super()

    this.containerEl = document.getElementById('file-library-search') as HTMLElement

    // Load saved options
    this._caseSensitive = settings.get('fileSearchCaseSensitive') ?? false
    this._wholeWord = settings.get('fileSearchWholeWord') ?? false

    this.addRibbonButton({
      [BUILT_IN]: true,
      id: GlobalSearchView.id,
      title: i18n.t.ribbon.search,
      icon: html`<i class="fa fa-search typ-lighter-icon"></i>`,
    })
  }

  onshow() {
    editor.library.fileSearch.show()
    this._keepSearchResult.showSearchPanel()
  }

  onhide() {
    $('#typora-sidebar').removeClass('ty-show-search ty-on-search')
  }

  getQuery() {
    return $(SELECTOR_QUERY_INPUT).val() as string ?? ''
  }

  setQuery(query: string) {
    $(SELECTOR_QUERY_INPUT).val(query)
  }

  /** Get current case-sensitive setting */
  getCaseSensitive(): boolean {
    return this._caseSensitive
  }

  /** Get current whole-word setting */
  getWholeWord(): boolean {
    return this._wholeWord
  }

  startSearch() {
    // Note: GlobalSearch now handles custom search via _startCustomSearch().
    // This method is kept for backward compatibility but results are rendered
    // by the custom service, not by Typora's native implementation.
    editor.library.fileSearch.search(this.getQuery())
  }

  /**
   * Render a single search result into the DOM.
   *
   * Uses Typora's existing template structure (#file-search-item-template)
   * to maintain visual consistency with the native search UI.
   */
  renderResult(result: SearchResult): void {
    console.log('[GlobalSearchView] renderResult', { filePath: result.filePath, matchCount: result.matches.length })

    const resultsEl = document.querySelector(SELECTOR_RESULTS) as HTMLElement
    if (!resultsEl) {
      console.warn('[GlobalSearchView] renderResult - resultsEl not found')
      return
    }

    // Skip empty file paths (can happen from task3 file list)
    if (!result.filePath || !result.filePath.trim()) {
      console.log('[GlobalSearchView] renderResult - skipped: empty path')
      return
    }

    // Check if this file already has a DOM entry
    const existingItem = resultsEl.querySelector(`[data-path="${this._escapeSelector(result.filePath)}"]`) as HTMLElement

    // For filename-only matches (no content), create/update the item
    if (result.matches.length === 0) {
      console.log('[GlobalSearchView] renderResult - filename-only match', { hasExisting: !!existingItem })
      if (!existingItem) {
        this._appendFileItem(resultsEl, result)
      }
      return
    }

    // For content matches, append all lines to existing item or create new one.
    // With batched SearchResult (one per file), this handles the case where a
    // filename-only entry from Task 3 already exists and we now have content matches.
    console.log('[GlobalSearchView] renderResult - content match', { hasExisting: !!existingItem })
    if (existingItem) {
      for (const match of result.matches) {
        this._appendLineMatch(existingItem, match)
      }
    } else {
      this._appendFileItem(resultsEl, result)
    }
  }

  /** Clear all search results from the DOM. */
  clearResults(): void {
    console.log('[GlobalSearchView] clearResults')
    const resultsEl = document.querySelector(SELECTOR_RESULTS)
    if (resultsEl) {
      resultsEl.innerHTML = ''
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  /** Append a file result item to the results list. */
  private _appendFileItem(resultsEl: HTMLElement, result: SearchResult): void {
    console.log('[GlobalSearchView] _appendFileItem', { filePath: result.filePath, matchCount: result.matches.length })

    const mountFolder = useService('vault').path
    const sep = path.sep

    // Get relative path from mount folder
    let relativePath = result.filePath
    if (result.filePath.startsWith(mountFolder)) {
      relativePath = result.filePath.slice(mountFolder.length)
      if (relativePath.startsWith(sep) || relativePath.startsWith('/')) {
        relativePath = relativePath.slice(1)
      }
    }

    // Parse path into folder, name, extension
    const lastSlash = relativePath.replace(/\\/g, '/').replace(/\/$/, '').lastIndexOf('/')
    const fileName = relativePath.substring(lastSlash + 1) || relativePath
    const fileExtIdx = fileName.lastIndexOf('.')
    const displayName = fileExtIdx > 0 ? fileName.substring(0, fileExtIdx) : fileName
    const extension = fileExtIdx > 0 ? fileName.substring(fileExtIdx) : ''
    const parentFolder = lastSlash > 0 ? relativePath.substring(0, lastSlash) : ''

    // Create DOM structure matching Typora's template
    const itemEl = document.createElement('div')
    itemEl.className = 'ty-search-item file-list-item'
    itemEl.dataset.path = result.filePath

    // File name + extension row
    const nameRow = document.createElement('div')
    nameRow.className = 'file-list-item-name'

    const namePart = document.createElement('span')
    namePart.className = 'file-list-item-file-name-part'
    this._highlightMatch(namePart, displayName, result.matches[0]?.matchedText ?? '')

    const extPart = document.createElement('span')
    extPart.className = 'file-list-item-file-ext-part'
    extPart.textContent = extension

    nameRow.appendChild(namePart)
    nameRow.appendChild(extPart)

    // Parent folder path row
    const locEl = document.createElement('div')
    locEl.className = 'file-list-item-parent-loc'
    if (parentFolder) {
      locEl.textContent = parentFolder.split(sep).join(PATH_SEP)
    }

    // Match count badge
    const countEl = document.createElement('span')
    countEl.className = 'file-list-item-count'
    countEl.textContent = result.matches.length > 0 ? String(result.matches.length) : ''

    // Matches container (for content matches)
    const matchesContainer = document.createElement('div')
    matchesContainer.className = 'ty-search-item-matches'

    itemEl.appendChild(nameRow)
    itemEl.appendChild(locEl)
    itemEl.appendChild(countEl)
    itemEl.appendChild(matchesContainer)

    resultsEl.appendChild(itemEl)

    // Auto-expand if more than 3 matches
    if (result.matches.length > 3) {
      itemEl.classList.add('ty-search-item-expand')
    }

    // Render line matches
    for (const match of result.matches) {
      this._appendLineToContainer(matchesContainer, itemEl, match)
    }
  }

  /** Append a single line match to an existing file item. */
  private _appendLineMatch(itemEl: HTMLElement, match: NonNullable<SearchResult['matches']>[number]): void {
    const matchesContainer = itemEl.querySelector('.ty-search-item-matches') as HTMLElement | null
    if (!matchesContainer) return

    this._appendLineToContainer(matchesContainer, itemEl, match)
  }

  private _appendLineToContainer(
    container: HTMLElement,
    itemEl: HTMLElement,
    match: NonNullable<SearchResult['matches']>[number],
  ): void {
    const lineEl = document.createElement('div')
    lineEl.className = 'ty-search-item-line'

    // Store metadata for click handler
    lineEl.dataset.line = String(match.lineNumber)
    lineEl.dataset.lineText = match.lineText
    if (match.matchedText) {
      lineEl.dataset.match = match.matchedText
    }

    // Render line text with highlighted match
    this._renderLineText(lineEl, match.lineText, match.matchedText)

    container.appendChild(lineEl)

    // Update count display
    const countEl = itemEl.querySelector('.file-list-item-count') as HTMLElement | null
    if (countEl) {
      const currentCount = parseInt(countEl.textContent ?? '0', 10)
      countEl.textContent = String(currentCount + 1)
    }

    // Auto-expand if we've accumulated enough matches
    const totalLines = container.querySelectorAll('.ty-search-item-line').length
    if (totalLines > 3 && !itemEl.classList.contains('ty-search-item-expand')) {
      itemEl.classList.add('ty-search-item-expand')
    }
  }

  /** Highlight a match within file name text. */
  private _highlightMatch(container: HTMLElement, fileName: string, matchText: string): void {
    if (!matchText || !fileName) {
      container.textContent = fileName
      return
    }

    const idx = fileName.toLowerCase().indexOf(matchText.toLowerCase())
    if (idx < 0) {
      container.textContent = fileName
      return
    }

    // Text before match
    if (idx > 0) {
      container.appendChild(document.createTextNode(fileName.substring(0, idx)))
    }

    // Matched text (highlighted)
    const markEl = document.createElement('span')
    markEl.className = 'ty-file-search-match-text'
    markEl.textContent = fileName.substring(idx, idx + matchText.length)
    container.appendChild(markEl)

    // Text after match
    const afterText = fileName.substring(idx + matchText.length)
    if (afterText) {
      container.appendChild(document.createTextNode(afterText))
    }
  }

  /** Render a line of text with the matched portion highlighted. */
  private _renderLineText(container: HTMLElement, lineText: string, matchText: string): void {
    if (!matchText || !lineText) {
      container.appendChild(document.createTextNode(lineText))
      return
    }

    const idx = lineText.indexOf(matchText)
    if (idx < 0) {
      container.appendChild(document.createTextNode(lineText))
      return
    }

    // Text before match
    if (idx > 0) {
      container.appendChild(document.createTextNode(lineText.substring(0, idx)))
    }

    // Matched text (highlighted)
    const markEl = document.createElement('span')
    markEl.className = 'ty-file-search-match-text'
    markEl.textContent = matchText
    container.appendChild(markEl)

    // Text after match
    const afterText = lineText.substring(idx + matchText.length)
    if (afterText) {
      container.appendChild(document.createTextNode(afterText))
    }
  }

  /** Escape special characters for use in data-path attribute selector. */
  private _escapeSelector(str: string): string {
    return str.replace(/([^\w\-./])/g, '\\$1')
  }
}


class KeepSearchResult extends Component {

  private SETTING_KEY = 'keepSearchResult' as const

  constructor(
    private settings = useService('settings'),
    private sidebar = useService('sidebar'),
  ) {
    super()

    const { SETTING_KEY } = this

    if (settings.get(SETTING_KEY)) {
      this.load()
    }

    settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  onload() {
    this.register(
      decorate(editor.library.fileSearch, 'clearSearch', () => noop)
    )
  }

  showSearchPanel() {
    if (this.settings.get(this.SETTING_KEY))
      $('#typora-sidebar').addClass('ty-on-search')
  }
}


class ShowSearchResultFullPath extends Component {

  private observer = new MutationObserver(_ => this.appendTitle(_))

  constructor(
    settings = useService('settings'),
  ) {
    super()

    const SETTING_KEY = 'showSearchResultFullPath'

    if (settings.get(SETTING_KEY)) {
      this.load()
    }

    settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  private appendTitle = (mutationsList: MutationRecord[]) => {
    mutationsList.forEach(mutation => {
      if (mutation.type !== 'childList') return
      mutation.addedNodes.forEach((node: unknown) => {
        if (!(node instanceof HTMLElement)) return
        const loc = node.querySelector('.file-list-item-parent-loc') as HTMLElement | null

        // NOTE: Files in root not has `loc` element
        if (!loc) return

        loc.title = loc.innerText
      })
    })
  }

  onload() {
    const resultsEl = $('#file-library-search-result').get(0) as HTMLElement | null
    if (!resultsEl) return
    this.observer.observe(resultsEl, {
      attributes: false,
      childList: true,
      subtree: true,
    })
  }

  onunload() {
    this.observer.disconnect()
  }
}
