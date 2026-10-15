/**
 * A queue that defers tasks while it is in "deferring" mode.
 *
 * Used to hold incremental work (e.g. cache updates triggered while a full
 * index is running) until {@link end} is called, so the work is applied to the
 * published state instead of being clobbered by the in-flight operation.
 */
export class DeferredQueue {

  private _deferring = false
  private _draining = false
  private _tasks: Array<() => Promise<void>> = []

  /** Whether new tasks are currently queued instead of run immediately. */
  get deferring(): boolean {
    return this._deferring
  }

  /** Enter deferring mode: subsequent tasks are queued until {@link end}. */
  begin(): void {
    this._deferring = true
  }

  /**
   * Leave deferring mode and run every queued task, including tasks added while
   * draining. Re-entrant calls while draining are ignored.
   */
  async end(): Promise<void> {
    this._deferring = false
    if (this._draining) return

    this._draining = true
    try {
      while (this._tasks.length > 0) {
        const task = this._tasks.shift()!
        try {
          await task()
        } catch {
          // Individual task failures are the producer's responsibility.
        }
      }
    } finally {
      this._draining = false
    }
  }

  /**
   * Queue a synchronous task when deferring.
   *
   * @returns `true` when the task was queued, `false` (and no-op) otherwise.
   */
  defer(task: () => void): boolean {
    if (!this._deferring) return false

    this._tasks.push(async () => task())
    return true
  }

  /**
   * Run an asynchronous task now, or queue it when deferring. When deferred,
   * the returned promise settles once the task eventually runs.
   */
  run(task: () => Promise<void>): Promise<void> {
    if (!this._deferring) return task()

    return new Promise<void>((resolve, reject) => {
      this._tasks.push(() => task().then(resolve, reject))
    })
  }
}
