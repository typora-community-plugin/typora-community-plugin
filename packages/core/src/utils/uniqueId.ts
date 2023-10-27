const counter: Record<string, number> = {}


export function uniqueId(prefix: string = '') {

  if (!counter[prefix]) counter[prefix] = 0

  return prefix + (++counter[prefix])
}
