import { useService } from 'src/common/service'
import path from 'src/path'
import type { SearchResult } from './services/text-search-service'


export const SELECTOR_RESULTS = '#file-library-search-result'

/** Separator character for path parts in parent-loc display */
const PATH_SEP = " / "

/** Number of results to render per rAF batch */
const BATCH_SIZE = 20

/**
 * Pure DOM renderer for global search results.
 *
 * Extracted from `GlobalSearchView` to keep the view component thin
 * and give the renderer a single, testable responsibility: turning
 * `SearchResult` objects into Typora DOM nodes.
 *
 * Render results are batched via requestAnimationFrame (20 per frame)
 * to avoid blocking the UI thread when processing thousands of results.
 * Dedup lookup uses a Map cache instead of DOM querySelector.
 */
export class SearchResultRenderer {

  /** Cached parsed template DOM node, initialized once on first use */
  private _templateDom: HTMLElement | null = null

  /** Map: normalized file path → DOM element (O(1) dedup, no querySelector) */
  private _pathElMap = new Map<string, HTMLElement>()

  /** Render queue for rAF-batched DOM insertion */
  private _queue: Array<{ result: SearchResult; resultsEl: HTMLElement }> = []

  /** Current rAF id, null when idle */
  private _rafId: number | null = null

  /** Called when the render queue has fully drained */
  private _onDrain: (() => void) | null = null

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * Enqueue a search result for batched rendering.
   * Results are inserted into the DOM in batches via requestAnimationFrame,
   * yielding to the UI thread between batches.
   */
  renderResult(result: SearchResult, resultsEl?: HTMLElement): void {
    // Skip empty file paths (can happen from task3 file list)
    if (!result.filePath || !result.filePath.trim()) return

    this._queue.push({
      result,
      resultsEl: resultsEl ?? document.querySelector(SELECTOR_RESULTS)!,
    })
    this._scheduleFlush()
  }

  /** Clear all search results from the DOM. */
  clearResults(resultsEl: HTMLElement = document.querySelector(SELECTOR_RESULTS)!): void {
    this._cancelFlush()
    this._queue.length = 0
    this._pathElMap.clear()
    resultsEl.innerHTML = ''
  }

  /**
   * Register a callback that fires when all queued results have been rendered.
   * If the queue is already empty, the callback fires immediately.
   */
  onDrain(callback: () => void): void {
    if (this._queue.length === 0 && this._rafId === null) {
      callback()
    } else {
      this._onDrain = callback
    }
  }

  // ── Batch scheduling ─────────────────────────────────────────────────

  private _scheduleFlush(): void {
    if (this._rafId !== null) return
    this._rafId = requestAnimationFrame(() => this._flushBatch())
  }

  private _cancelFlush(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  private _flushBatch(): void {
    this._rafId = null

    const batch = this._queue.splice(0, BATCH_SIZE)
    for (const { result, resultsEl } of batch) {
      this._renderOne(result, resultsEl)
    }

    if (this._queue.length > 0) {
      this._scheduleFlush()
    } else {
      const cb = this._onDrain
      this._onDrain = null
      cb?.()
    }
  }

  // ── Core rendering ──────────────────────────────────────────────────

  /** Render a single result (called from batch flush). */
  private _renderOne(result: SearchResult, resultsEl: HTMLElement): void {
    const normalizedPath = result.filePath.split(/[\\/]/).join(path.sep)
    const existingItem = this._pathElMap.get(normalizedPath)

    // For filename-only matches (no content), create/update the item
    if (result.matches.length === 0) {
      if (!existingItem) {
        this._appendFileItem(resultsEl, result)
      }
      return
    }

    // For content matches, append all lines to existing item or create new one.
    if (existingItem) {
      for (const match of result.matches) {
        // Field matches (tag:, title:, filename:) are already rendered by the
        // initial indexOnlySearch call — skip them to avoid duplication.
        if (match.source?.startsWith('field:')) continue
        const matchesContainer = existingItem.querySelector('.ty-search-item-matches') as HTMLElement | null
        if (matchesContainer) {
          this._appendLineToContainer(matchesContainer, existingItem, match)
        }
      }
    } else {
      this._appendFileItem(resultsEl, result)
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  /** Append a file result item to the results list. */
  private _appendFileItem(resultsEl: HTMLElement, result: SearchResult): void {
    const mountPath = useService('vault').path

    // Get relative path from mount folder (normalize slashes)
    const relPath = result.filePath.startsWith(mountPath)
      ? result.filePath.slice(mountPath.length).replace(/^[/\\]/, '')
      : result.filePath

    // Parse path into components (normalize to forward slashes for consistent parsing)
    const normalized = relPath.replace(/\\/g, '/')
    const lastSlash = normalized.endsWith('/') ? normalized.lastIndexOf('/', normalized.length - 2) : normalized.lastIndexOf('/')
    const fileName = normalized.substring(lastSlash + 1) || normalized
    const dotIdx = fileName.indexOf('.')
    const displayName = dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName
    const extension = dotIdx > 0 ? fileName.substring(dotIdx) : ''
    const parentFolder = lastSlash > 0 ? normalized.substring(0, lastSlash) : ''

    // Clone from cached template DOM (parsed once, reused via cloneNode)
    const itemEl = this._getTemplateDom()?.cloneNode(true) as HTMLElement | null
    if (!itemEl) return

    // Set data-path for identification (normalize to OS-specific path separators)
    itemEl.dataset.path = result.filePath.split(/[\\/]/).join(path.sep)

    // Cache in Map for O(1) dedup lookup
    this._pathElMap.set(itemEl.dataset.path, itemEl)

    // Fill filename parts (with highlight on name part)
    const namePartEl = itemEl.querySelector('.file-list-item-file-name-part') as HTMLElement | null
    if (namePartEl) {
      this._highlightMatch(namePartEl, displayName, result.matches[0]?.matchedText ?? '')
    }

    // Fill extension
    const extPartEl = itemEl.querySelector('.file-list-item-file-ext-part') as HTMLElement | null
    if (extPartEl) {
      extPartEl.textContent = extension
    }

    // Fill parent folder path
    const locEl = itemEl.querySelector('.file-list-item-parent-loc') as HTMLElement | null
    if (locEl && parentFolder) {
      locEl.textContent = parentFolder.split('/').join(PATH_SEP)
    }

    // Set match count (exclude field:filename — used only for filename highlighting)
    const visibleMatches = result.matches.filter(m => m.source !== 'field:filename')
    const countEl = itemEl.querySelector('.file-list-item-count') as HTMLElement | null
    if (countEl) {
      countEl.textContent = visibleMatches.length > 0 ? String(visibleMatches.length) : ''
    }

    resultsEl.appendChild(itemEl)

    // Auto-expand if more than 3 visible matches
    if (visibleMatches.length > 3) {
      itemEl.classList.add('ty-search-item-expand')
    }

    // Render line matches (skip field:filename — used only for filename highlighting)
    const matchesContainer = itemEl.querySelector('.ty-search-item-matches') as HTMLElement | null
    for (const match of result.matches) {
      if (match.source === 'field:filename') continue
      this._appendLineToContainer(matchesContainer!, itemEl, match)
    }
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

  /** Append highlighted text to container: before + mark(span) + after. */
  private _appendHighlightedText(container: HTMLElement, fullText: string, matchStart: number, matchLength: number): void {
    if (matchStart > 0) {
      container.appendChild(document.createTextNode(fullText.substring(0, matchStart)))
    }

    const markEl = document.createElement('span')
    markEl.className = 'ty-file-search-match-text'
    markEl.textContent = fullText.substring(matchStart, matchStart + matchLength)
    container.appendChild(markEl)

    const afterText = fullText.substring(matchStart + matchLength)
    if (afterText) {
      container.appendChild(document.createTextNode(afterText))
    }
  }

  /** Highlight a match within file name text. */
  private _highlightMatch(container: HTMLElement, fileName: string, matchText: string): void {
    if (!matchText || !fileName) {
      container.textContent = fileName
      return
    }

    // Case-insensitive search for filename highlighting
    const lowerFull = fileName.toLowerCase()
    const lowerMatch = matchText.toLowerCase()
    const idx = lowerFull.indexOf(lowerMatch)
    if (idx < 0) {
      container.textContent = fileName
      return
    }

    this._appendHighlightedText(container, fileName, idx, matchText.length)
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

    this._appendHighlightedText(container, lineText, idx, matchText.length)
  }

  /**
   * Get the parsed template DOM node, cached after first call.
   *
   * Reads from `<script id="file-search-item-template" type="text/x-template">`
   * (or a native `<template>` element), parses innerHTML into real DOM nodes,
   * and caches the result so subsequent calls use `cloneNode()` only.
   */
  private _getTemplateDom(): HTMLElement | null {
    if (this._templateDom) return this._templateDom

    const raw = document.getElementById('file-search-item-template')
    if (!raw) {
      console.warn('[SearchResultRenderer] file-search-item-template not found in DOM')
      return null
    }

    // Handle native <template> vs <script type="text/x-template">
    if (raw.tagName === 'TEMPLATE' && (raw as HTMLTemplateElement).content) {
      this._templateDom = (raw as HTMLTemplateElement).content.querySelector('.ty-search-item') as HTMLElement | null
    } else {
      const container = document.createElement('div')
      container.innerHTML = raw.innerHTML.trim()
      this._templateDom = container.firstElementChild as HTMLElement | null
    }

    return this._templateDom
  }
}
