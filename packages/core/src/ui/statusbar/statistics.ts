import { editor } from 'typora'
import { Component } from 'src/common/component'
import type { DisposeFunc } from 'src/utils/types'
import decorate from '@plylrnsdy/decorate.js'
import { throttle } from 'src/utils'


const TBODY_SEL = 'li.ty-footer-word-count-all table tbody'

/**
 * Evaluation context passed to {@link StatisticHandler.eval}. Provides lazy-cached access
 * to the current document's markdown content and cross-stat value sharing.
 */
export class StatisticContext {

  /** Maps built-in Typora footer stat IDs to their corresponding DOM element selectors. */
  private static readonly _DOM_STAT_IDS: Record<string, string> = {
    'reading-time': '#footer-read-time-count-td',
    'lines': '#footer-line-count-td',
    'words': '#footer-word-count-td',
    'characters': '#footer-char-count-td',
  }

  private _markdown: string | undefined
  private readonly _values: Record<string, string | null> = {}

  /** Lazily reads the current document's markdown once; subsequent accesses return the cached value. */
  get markdown(): string {
    return this._markdown ??= editor.getMarkdown()
  }

  set markdown(value: string) {
    this._markdown = value
  }

  /**
   * Get a stat's result by its `id`. Returns `null` if not yet computed or was hidden.
   *
   * For the built-in Typora footer stats (`reading-time`, `lines`, `words`, `characters`),
   * falls back to lazily reading from the raw DOM when no previously computed value exists.
   */
  get(id: string): string | null {
    return this._values[id] ?? this._lazyFromDOM(id)
  }

  /** Lazy-load a built-in stat value from the Typora footer DOM. */
  private _lazyFromDOM(id: string): string | null {
    const selector = StatisticContext._DOM_STAT_IDS[id]
    if (!selector) return null
    const el = document.querySelector<HTMLElement>(selector)
    const val = el?.textContent?.trim() ?? null
    this._values[id] = val
    return val
  }

  /** Set a value under any stat's id (including the current one) so it can be read via {@link get}. Use `null` to indicate hidden/skipped. Call from within {@link StatisticHandler.eval} — pass your own id or another stat's id. */
  set(id: string, value: string | null) {
    this._values[id] = value
  }
}

/**
 * A registered statistic item displayed as a row in the word-count footer panel.
 */
export type StatisticHandler = {
  /** Unique identifier across all registered statistics. Used as DOM `id` prefix (`typ-wc-{id}`). Must not collide with other registrations. */
  id: string

  /** Display name / unit label shown in the statistic row. */
  name: string

  /**
   * Compute the value for this statistic.
   *
   * @param context Provides lazy-cached markdown via `context.markdown`, cross-stat values via `context.get(otherId)`, and result storage via `context.set(id, value)`.
   */
  eval(context: StatisticContext): string | null
}


/**
 * Only compatible with Windows/Linux
 */
export class Statistics extends Component {

  private _stats: StatisticHandler[] = []
  private _observer: MutationObserver | null = null

  onload(): void {
    this.register(
      decorate.afterCall(editor.wordCount, 'updateLabel', () => {
        this._updateAllStats()
      }))

    this._observePanelClass()
  }

  onunload(): void {
    this._disconnectObserver()
    this._removeInjectedRows()
    this._stats = []
  }


  /* ─── public registry ────────────────────────────────── */

  /**
   * Register a statistic row.
   *
   * If the word count panel is already open the row is injected and synced
   * immediately.  Returns a dispose function that unregisters the statistic
   * and removes its DOM row.
   */
  registerStatistic(stat: StatisticHandler): DisposeFunc {
    if (this._stats.some(s => s.id === stat.id)) throw new Error(`[WordCountStatistics] Duplicate statistic id: "${stat.id}"`)

    this._stats.push(stat)
    if (document.body.classList.contains('ty-show-word-count')) {
      this._injectRow(stat)
      this._updateStat(stat, new StatisticContext())
    }

    return () => {
      this._stats = this._stats.filter(s => s !== stat)
      $(`#typ-wc-${stat.id}`).closest('tr').remove()
    }
  }


  /* ─── mutation observer on body class ────────────────── */

  private _observePanelClass(): void {
    this._observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes') continue
        const target = mutation.target as HTMLElement
        if (target.classList.contains('ty-show-word-count')) this._onPanelOpen()
        else this._onPanelClose()
        break
      }
    })

    this._observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  }

  private _disconnectObserver(): void {
    this._observer?.disconnect()
    this._observer = null
  }


  /* ─── panel open / close handlers ────────────────────── */

  private _onPanelOpen(): void {
    if (this._stats.length > 0 && !document.querySelector(`#typ-wc-${this._stats[0].id}`)) {
      this._stats.forEach(s => this._injectRow(s))
    }
    this._updateAllStats()
  }

  private _onPanelClose(): void {
    this._removeInjectedRows()
  }

  private _updateAllStats = throttle(() => {
    if (!document.body.classList.contains('ty-show-word-count')) return
    const context = new StatisticContext()
    this._stats.forEach(s => this._updateStat(s, context))
  }, 167)

  private _updateStat(stat: StatisticHandler, context: StatisticContext): void {
    const $cell = $(`#typ-wc-${stat.id}`)
    if (!$cell.length) return

    const val = stat.eval(context)
    context.set(stat.id, val)
    val === null
      ? $cell.closest('tr').hide()
      : ($cell.closest('tr').show(), $cell.text(val))
  }


  /* ─── inject all rows ────────────────────────────────── */

  private _injectRow(stat: StatisticHandler): void {
    const $tbody = $(TBODY_SEL)
    if ($tbody.length) {
      $tbody.append(`<tr><td id="typ-wc-${stat.id.replace(/#/g, '\\#')}">-</td><td>${stat.name}</td><td></td></tr>`)
    }
  }

  private _removeInjectedRows(): void {
    this._stats.forEach(s => $(`#typ-wc-${s.id}`).closest('tr').remove())
  }
}
