export type MergeStrategy =
  | 'replace'
  | 'deep'
  | 'concat'
  | 'concatUnique'

/** A merge declaration keyed by dot-path, e.g. `{ 'metadata.tags': 'concatUnique' }`. `'*'` is the fallback. */
export type MergeSpec = Record<string, MergeStrategy>

/**
 * Merge the results of multiple metadata providers into a single object.
 *
 * The strategy for each key is resolved from the provider's {@link MergeSpec}
 * by dot-path (`spec[keyPath]`), falling back to `spec['*']` for array values,
 * and finally to a default: plain objects are merged deeply, everything else is
 * replaced.
 */
export function mergeMetadata(
  entries: { data: Record<string, any>; spec?: MergeSpec }[],
): Record<string, any> {
  return entries.reduce(
    (acc, { data, spec }) => mergeInto(acc, data, spec ?? {}, ''),
    {} as Record<string, any>,
  )
}

function mergeInto(
  target: Record<string, any>,
  source: Record<string, any>,
  spec: MergeSpec,
  path: string,
): Record<string, any> {
  for (const key of Object.keys(source)) {
    const keyPath = path ? `${path}.${key}` : key
    const value = source[key]
    const isArray = Array.isArray(value) || Array.isArray(target[key])
    // `'*'` only acts as the fallback for array values; objects always merge
    // deeply so intermediate namespaces (e.g. `metadata`) are not clobbered.
    const strategy = spec[keyPath]
      ?? (isArray ? spec['*'] : undefined)
      ?? defaultStrategy(target[key], value)

    target[key] = applyStrategy(strategy, target[key], value, spec, keyPath)
  }
  return target
}

function defaultStrategy(existing: any, incoming: any): MergeStrategy {
  return isPlainObject(existing) && isPlainObject(incoming) ? 'deep' : 'replace'
}

function applyStrategy(
  strategy: MergeStrategy,
  existing: any,
  incoming: any,
  spec: MergeSpec,
  keyPath: string,
): any {
  switch (strategy) {
    case 'deep':
      if (isPlainObject(existing) && isPlainObject(incoming)) {
        return mergeInto({ ...existing }, incoming, spec, keyPath)
      }
      return incoming
    case 'concat':
      return (Array.isArray(existing) ? existing : []).concat(
        Array.isArray(incoming) ? incoming : [incoming],
      )
    case 'concatUnique':
      return uniqueConcat(
        Array.isArray(existing) ? existing : [],
        Array.isArray(incoming) ? incoming : [incoming],
      )
    case 'replace':
    default:
      return incoming
  }
}

function uniqueConcat(existing: any[], incoming: any[]): any[] {
  const seen = new Set<string>()
  const result: any[] = []
  for (const item of [...existing, ...incoming]) {
    const key = dedupeKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

function dedupeKey(item: any): string {
  if (isPlainObject(item) && typeof item.name === 'string') return `name:${item.name}`
  return `json:${JSON.stringify(item)}`
}

function isPlainObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
