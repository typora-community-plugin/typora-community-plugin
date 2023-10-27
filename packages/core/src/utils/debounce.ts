// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_debounce
export function debounce(func: Function, wait: number, immediate?: boolean) {
  let timeout: NodeJS.Timeout

  return (...args: any[]) => {
    let context = this
    clearTimeout(timeout)

    if (immediate && !timeout) func.apply(context, args)

    timeout = setTimeout(() => {
      timeout = null
      if (!immediate) func.apply(context, args)
    }, wait)
  }
}
