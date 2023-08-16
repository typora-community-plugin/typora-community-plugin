
/**
 * @example 1.0.0-beta.1 < 1.0.0 < 1.0.1 < 1.1.0 < 2.0.0
 */
export function compare(v1: string, v2: string) {
  const n1 = toNumbers(v1)
  const n2 = toNumbers(v2)

  for (let i = 0; i < 4; i++) {
    const a = n1[i] ?? 0
    const b = n2[i] ?? 0
    if (a === b) continue
    return Math.sign(a - b) as -1 | 0 | 1
  }
  return 0
}

function toNumbers(version: string): number[] {
  const n = version.split(/[^0-9]+/).map(d => +d)

  if (n.length === 4) {
    n[2] -= 1
  }
  return n
}
