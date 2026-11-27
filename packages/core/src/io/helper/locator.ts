import { bridge } from 'typora'
import type { HelperRuntime } from './protocol'
import { HELPER_PROTOCOL } from './protocol'


/**
 * Homebrew installs into `/opt/homebrew` on Apple Silicon and `/usr/local` on
 * Intel. Typora started from Finder inherits launchd's PATH, which contains
 * neither, so the binary must be looked up by absolute path.
 */
const BINARY_CANDIDATES = [
  '/opt/homebrew/bin/typora-helper',
  '/usr/local/bin/typora-helper',
]

const ENV_KEY = Symbol.for('typora-plugin-core@v2:env')

function fileExists(filepath: string): boolean {
  try {
    // Added in Typora 1.14.15: returns JSON, `{ binary: true }` for a Mach-O.
    const raw = bridge.callSync('path.readTextLimited', filepath)
    if (typeof raw !== 'string' || !raw) return false

    const info = JSON.parse(raw)
    if (info?.error === 'stat' || info?.error === 'path') return false
    if (info?.error) return true
    return Boolean(info?.content !== undefined || info?.tooLarge || info?.binary)
  }
  catch {
    // Older Typora: fall back to reading the file. A Mach-O is not text, but
    // any non-empty answer still proves the path exists.
    try {
      return Boolean(bridge.callSync('path.readText', filepath))
    }
    catch {
      return false
    }
  }
}

export function findHelperBinary(): string | null {
  const configured = (globalThis as Record<symbol, any>)[ENV_KEY]?.HELPER_PATH
  const candidates = typeof configured === 'string' && configured
    ? [configured, ...BINARY_CANDIDATES]
    : BINARY_CANDIDATES

  for (const candidate of candidates) {
    if (fileExists(candidate)) return candidate
  }

  return null
}

/** Cached binary path for this session; `null` means "not installed". */
let cached: string | null | undefined

export function detectHelperBinary(): string | null {
  if (cached !== undefined) return cached
  cached = findHelperBinary()
  return cached
}

export function resetHelperBinary() {
  cached = undefined
}

export type { HelperRuntime }
export { HELPER_PROTOCOL }
