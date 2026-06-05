import { editor } from 'typora'
import { Component } from 'src/common/component'
import type { DisposeFunc } from 'src/utils/types'
import decorate from '@plylrnsdy/decorate.js'


const TBODY_SEL = 'li.ty-footer-word-count-all table tbody'

/**
 * A registered statistic item displayed as a row in the word-count footer panel.
 */
export type WordCountStatistic = {
  /** Unique identifier across all registered statistics. Used as DOM `id` prefix (`typ-wc-{id}`). Must not collide with other registrations. */
  id: string

  /** Display name / unit label shown in the statistic row. */
  name: string

  /**
   * Compute the value for this statistic.
   *
   * @returns     A display string, or `null` to hide the row (useful when the
   *              statistic is conditionally applicable).
   */
  eval(): string | null
}

/**
 * Only compatible with Windows/Linux
 */
export class Statistics extends Component {

  private _stats: WordCountStatistic[] = []
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
  registerStatistic(stat: WordCountStatistic): DisposeFunc {
    if (this._stats.some(s => s.id === stat.id)) throw new Error(`[WordCountStatistics] Duplicate statistic id: "${stat.id}"`)

    this._stats.push(stat)
    if (document.body.classList.contains('ty-show-word-count')) {
      this._injectRow(stat)
      this._updateStat(stat)
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

  private _updateAllStats(): void {
    if (!document.body.classList.contains('ty-show-word-count')) return
    this._stats.forEach(s => this._updateStat(s))
  }

  private _updateStat(stat: WordCountStatistic): void {
    const $cell = $(`#typ-wc-${stat.id}`)
    if (!$cell.length) return

    const val = stat.eval()
    val === null
      ? $cell.closest('tr').hide()
      : ($cell.closest('tr').show(), $cell.text(val))
  }


  /* ─── inject all rows ────────────────────────────────── */

  private _injectRow(stat: WordCountStatistic): void {
    const $tbody = $(TBODY_SEL)
    if ($tbody.length) {
      $tbody.append(`<tr><td id="typ-wc-${stat.id.replace(/#/g, '\\#')}">-</td><td>${stat.name}</td><td></td></tr>`)
    }
  }

  private _removeInjectedRows(): void {
    this._stats.forEach(s => $(`#typ-wc-${s.id}`).closest('tr').remove())
  }
}
