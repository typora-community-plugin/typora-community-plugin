export function memorize<T extends Function>(fn: T): T {
  const cache = {} as Record<string, any>

  return function (...args: any[]) {

    const key = JSON.stringify(args)

    if (cache[key]) {
      return cache[key]
    }
    else {
      const res = fn.apply(this, args)
      cache[key] = res
      return res
    }
  } as any as T
}
