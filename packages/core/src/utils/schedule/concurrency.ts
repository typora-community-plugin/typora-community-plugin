export interface ConcurrentOptions {
  /** Aborts the run before the next item is picked up. */
  signal?: AbortSignal
  /** Called after each item completes, with the number of finished items. */
  onProgress?: (completed: number, total: number) => void
}


/**
 * Run `worker` over `items` with at most `limit` tasks in flight.
 *
 * A fixed pool of workers drains the list, so the number of pending promises
 * stays bounded regardless of how many items there are (unlike mapping every
 * item to a promise at once).
 */
export async function runConcurrent<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
  options: ConcurrentOptions = {},
): Promise<void> {
  const { signal, onProgress } = options
  const queue = items.slice()
  const total = queue.length
  let completed = 0

  const run = async () => {
    while (queue.length > 0) {
      signal?.throwIfAborted()
      const item = queue.pop()!
      await worker(item)
      completed++
      onProgress?.(completed, total)
    }
  }

  const count = Math.min(limit, queue.length)
  await Promise.all(Array.from({ length: count }, run))
}
