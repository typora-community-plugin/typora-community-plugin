import type { Truthy } from "lodash"

export function until<T>(condition: () => T): Promise<Truthy<T>> {
  return new Promise(resolve => {
    const timer = setInterval(_try, 352)

    function _try() {
      const res = condition()
      if (!res) return
      clearInterval(timer)
      resolve(res as any)
    }
  })
}
