/**
 * Protocol spoken with `packages/helper-macos`.
 *
 * Keep `HELPER_PROTOCOL` in sync with `protocol.zig`. Core accepts a helper
 * whose protocol is at least this value; a newer helper with extra ops keeps
 * working, an older one is ignored and the shell path is used instead.
 */
export const HELPER_PROTOCOL = 1

export interface HelperRuntime {
  protocol: number
  version: string
  port: number
  pid: number
  token: string
  startedMs?: number
}

export interface HelperSuccess<T> {
  ok: true
  data: T
}

export interface HelperFailure {
  ok: false
  error: {
    code: string
    message: string
  }
}

export type HelperResponse<T> = HelperSuccess<T> | HelperFailure

/** `list` / `listDirs` response. */
export interface HelperListInfo {
  names: string[]
}

/** `stat` response. */
export interface HelperStatInfo {
  exists: boolean
  isDir: boolean
  isFile: boolean
  size: number
  mtimeMs: number
}

/** The helper answered, but the operation failed (bad path, EACCES, ...). */
export class HelperOpError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'HelperOpError'
    this.code = code
  }
}

/** The helper cannot be reached: not installed, cancelled, crashed, timed out. */
export class HelperUnavailableError extends Error {
  constructor(message = 'Helper is unavailable.') {
    super(message)
    this.name = 'HelperUnavailableError'
  }
}
