// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_debounce
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number, immediate?: boolean): T {
  let timeout: NodeJS.Timeout

  return function (...args: any[]) {
    clearTimeout(timeout)

    if (immediate && !timeout) func.apply(this, args)

    timeout = setTimeout(() => {
      timeout = null
      if (!immediate) func.apply(this, args)
    }, wait)
  } as T
}
