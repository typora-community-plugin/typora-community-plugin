/**
 * Ripgrep child-process lifecycle: spawn, track, settle, kill.
 *
 * Owns the running process sets and the "text run" generation counter so that
 * close/error events from superseded runs are ignored. Knows nothing about
 * queries, output formats, or file paths — those are the callers' business.
 */
import type { ChildProcess } from "node:child_process"
import { requireChildProcess } from "./rg-platform"


/** Result of a single `rg -l` whole-file scan. */
export interface NegationScanResult {
  /** False when the scan failed. rg exiting 1 (nothing matched) is a success. */
  ok: boolean
  /** Raw file paths printed by `-l`, exactly as ripgrep emitted them. */
  paths: string[]
}

/**
 * Handle on the current text run. Settlement bookkeeping is bound to the run
 * generation that created it; events from superseded runs are ignored.
 */
export interface TextRunHandle {
  /** Spawn a ripgrep process with piped stdout/stderr. */
  spawn(rgPath: string, args: string[], cwd: string): ChildProcess
  /** Register a spawned process; its settlement counts toward this run. */
  track(proc: ChildProcess): ChildProcess
}


export class RipgrepProcessManager {

  /** Running content/filename scans of the current text run. */
  private _textTasks = new Set<ChildProcess>()
  /** Running whole-file negation scans (independent of the text run). */
  private _negationTasks = new Set<ChildProcess>()
  /** Incremented on every reset so stale `close` events are ignored. */
  private _textRunId = 0

  constructor(
    private _requireChildProcess: () => typeof import("child_process") = requireChildProcess,
  ) { }

  /**
   * Kill the previous text run and open a new generation.
   *
   * @param onAllSettled fired once when every tracked process of the new run
   * has closed — and only while that run is still the current one.
   */
  beginTextRun(onAllSettled: () => void): TextRunHandle {
    this._killTasks(this._textTasks)
    this._textTasks.clear()
    this._textRunId++
    const runId = this._textRunId
    let expected = 0

    return {
      spawn: (rgPath, args, cwd) => this._spawn(rgPath, args, cwd),

      track: (proc) => {
        this._textTasks.add(proc)
        expected++
        // `settle` is idempotent because both `error` and `close` may fire;
        // events from superseded runs are ignored.
        let settled = false
        const settle = () => {
          if (settled) return
          settled = true
          this._textTasks.delete(proc)
          if (runId !== this._textRunId) return
          if (this._textTasks.size === 0 && expected > 0) {
            onAllSettled()
          }
        }
        proc.on("close", settle)
        proc.on("error", settle)
        return proc
      },
    }
  }

  /**
   * Stop the current text scan, keeping whole-file negation scans alive.
   * Called by the facade on `cancel()` next to {@link cancelAll}.
   */
  cancelTextRun(): void {
    this._killTasks(this._textTasks)
    this._textTasks.clear()
    this._textRunId++
  }

  /** Kill everything: the text run and all negation scans. */
  cancelAll(): void {
    this._killTasks(this._textTasks)
    this._killTasks(this._negationTasks)
    this._textTasks.clear()
    this._negationTasks.clear()
    this._textRunId++
  }

  /**
   * Run one `rg -l` style whole-file scan and collect the printed paths.
   *
   * Exit-code semantics: ripgrep exits 1 when nothing matched — a successful,
   * empty result, not a failure.
   */
  scanFilesWithMatches(rgPath: string, args: string[], cwd: string): Promise<NegationScanResult> {
    return new Promise<NegationScanResult>(resolve => {
      let proc: ChildProcess
      try {
        proc = this._spawn(rgPath, args, cwd)
      } catch {
        resolve({ ok: false, paths: [] })
        return
      }

      this._negationTasks.add(proc)

      let output = ""
      let settled = false
      const finish = (ok: boolean) => {
        if (settled) return
        settled = true
        this._negationTasks.delete(proc)
        // Failed scans discard their output; callers must fail closed.
        resolve({ ok, paths: ok ? splitLines(output) : [] })
      }

      proc.stdout.on("data", (chunk: string) => { output += chunk })
      proc.stderr.on("data", () => { /* ignore rg warnings, e.g. permission denied */ })
      proc.on("error", () => finish(false))
      proc.on("close", (code) => finish(code === 0 || code === 1))
    })
  }

  /** Spawn ripgrep with piped, utf8-encoded stdout/stderr. */
  private _spawn(rgPath: string, args: string[], cwd: string): ChildProcess {
    const proc = this._requireChildProcess().spawn(rgPath, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    })
    proc.stdout.setEncoding("utf8")
    proc.stderr.setEncoding("utf8")
    return proc
  }

  /** Kill each running process in `tasks`; references are cleared by the caller. */
  private _killTasks(tasks: Set<ChildProcess>): void {
    for (const proc of tasks) {
      if (!proc.killed) {
        try { proc.kill() } catch { /* ignore */ }
      }
    }
  }
}


/** Trim, drop empty lines. */
function splitLines(output: string): string[] {
  const paths: string[] = []
  for (const line of output.split(/\r?\n/g)) {
    const trimmed = line.trim()
    if (trimmed) paths.push(trimmed)
  }
  return paths
}
