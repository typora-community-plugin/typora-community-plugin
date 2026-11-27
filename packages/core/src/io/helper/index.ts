import { isCommandCancelled, Shell } from 'src/io/shell'
import { File } from 'typora'
import { callHelper, health } from './client'
import { detectHelperBinary, resetHelperBinary } from './locator'
import { type HelperRuntime, HelperUnavailableError } from './protocol'
import { helperDataDir, readRuntime } from './runtime'


/** Idle seconds after which a spawned helper exits by itself. */
const IDLE_TIMEOUT_S = 120
/** Core pings well inside the idle timeout so the helper stays alive. */
const HEARTBEAT_MS = 20_000
const SPAWN_READY_MS = 5_000
const SPAWN_ATTEMPTS = 2

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

/**
 * Owns the connection to `typora-helper` on macOS.
 *
 * One approval dialog per Typora launch, at most: `ensure()` starts the helper
 * once, and every later operation is an HTTP request. When the user cancels
 * that dialog, `request()` rejects with `HelperUnavailableError` and callers
 * fall back to the shell path for the rest of the session instead of asking
 * again on every file operation.
 */
class MacHelper {
  private _runtime: HelperRuntime | null = null
  private _starting: Promise<HelperRuntime | null> | null = null
  private _disabled = false
  private _spawns = 0
  private _heartbeat: ReturnType<typeof setInterval> | null = null

  get ready() {
    return this._runtime !== null
  }

  getUserCancelled() {
    return this._disabled
  }

  /** Whether using the helper is possible at all in this session. */
  isEnabled() {
    return File.isMac && !this._disabled
  }

  async ensure(): Promise<HelperRuntime | null> {
    if (!this.isEnabled()) return null
    if (this._runtime) return this._runtime
    if (this._starting) return this._starting

    const starting = this._start().finally(() => {
      if (this._starting === starting) this._starting = null
    })
    this._starting = starting
    return starting
  }

  request<T>(op: string, args: Record<string, unknown> = {}, timeoutMs?: number): Promise<T> {
    return this._request<T>(op, args, timeoutMs, true)
  }

  /** Drops the cached connection, e.g. after `brew upgrade`. */
  reset() {
    this._forget()
    this._disabled = false
    this._spawns = 0
    resetHelperBinary()
  }

  private async _request<T>(
    op: string,
    args: Record<string, unknown>,
    timeoutMs: number | undefined,
    allowRetry: boolean,
  ): Promise<T> {
    const runtime = await this.ensure()
    if (!runtime) throw new HelperUnavailableError()

    try {
      return await callHelper<T>(runtime, op, args, timeoutMs)
    }
    catch (error) {
      if (error instanceof HelperUnavailableError && allowRetry) {
        this._forget()
        return this._request<T>(op, args, timeoutMs, false)
      }
      throw error
    }
  }

  private async _start(): Promise<HelperRuntime | null> {
    // A helper may already be running: started by an earlier window, left over
    // from the previous launch, or run as a Homebrew service.
    const existing = readRuntime()
    if (existing && await health(existing)) {
      return this._adopt(existing)
    }

    if (this._spawns >= SPAWN_ATTEMPTS) {
      this._disabled = true
      return null
    }

    const binary = detectHelperBinary()
    if (!binary) {
      // Not installed. Keep the session usable through the shell path.
      this._disabled = true
      return null
    }

    this._spawns += 1

    const command = [
      Shell.escape(binary),
      'serve',
      '--daemon',
      '--data-dir', Shell.escape(helperDataDir()),
      '--idle-timeout', String(IDLE_TIMEOUT_S),
    ].join(' ')

    try {
      await Shell.run(command)
    }
    catch (error) {
      // This is the one approval dialog. Cancelling it is a decision for the
      // whole session; do not re-ask on every file operation.
      if (isCommandCancelled(error)) this._disabled = true
      resetHelperBinary()
      this._forget()
      return null
    }

    const started = await this._waitUntilReady()
    if (!started) {
      this._disabled = true
      return null
    }

    return this._adopt(started)
  }

  private async _waitUntilReady(): Promise<HelperRuntime | null> {
    const deadline = Date.now() + SPAWN_READY_MS

    while (Date.now() < deadline) {
      const runtime = readRuntime()
      if (runtime && await health(runtime, 500)) return runtime
      await sleep(100)
    }

    return null
  }

  private _adopt(runtime: HelperRuntime) {
    this._runtime = runtime
    this._startHeartbeat()
    return runtime
  }

  private _forget() {
    this._runtime = null
    if (this._heartbeat !== null) {
      clearInterval(this._heartbeat)
      this._heartbeat = null
    }
  }

  private _startHeartbeat() {
    if (this._heartbeat !== null) return

    this._heartbeat = setInterval(() => {
      const runtime = this._runtime
      if (!runtime) return

      callHelper(runtime, 'ping').catch(() => this._forget())
    }, HEARTBEAT_MS)
  }
}

export const macHelper = new MacHelper()
