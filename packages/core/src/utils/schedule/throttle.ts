/**
 * Throttle a function so it executes at most once per `wait` ms.
 * The first call always runs immediately; subsequent calls within the window are ignored.
 */
export function throttle<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (!timeout) {
      func.apply(this, args)
      timeout = setTimeout(() => {
        timeout = null
      }, wait)
    }
  } as unknown as T
}
