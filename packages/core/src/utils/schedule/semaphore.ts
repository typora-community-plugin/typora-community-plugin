/**
 * Counting semaphore that bounds the number of tasks running concurrently.
 *
 * Slots are handed directly to the next waiter on {@link release} instead of
 * being freed first, so a queued caller can never race past the limit.
 */
export class Semaphore {

  private _active = 0
  private _waiters: Array<() => void> = []

  constructor(private _limit: number) { }

  /** Acquire a slot, waiting until one is free. */
  async acquire(): Promise<void> {
    if (this._active < this._limit) {
      this._active++
      return
    }
    await new Promise<void>(resolve => this._waiters.push(resolve))
  }

  /** Release a slot, handing it to the next waiter when one is queued. */
  release(): void {
    const next = this._waiters.shift()
    if (next) next()
    else this._active--
  }

  /** Acquire a slot, run `task`, and release the slot afterwards. */
  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await task()
    } finally {
      this.release()
    }
  }
}
