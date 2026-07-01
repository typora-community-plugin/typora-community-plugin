import type { ILogger } from "src/io/logger/logger"

type LogOptions = Partial<{
  entry: boolean
  exit: boolean
  errors: boolean
  perf: boolean
  args: boolean
}>

interface LogEntry {
  scope: string
  method: string
  direction: 'enter' | 'exit' | 'error'
  timestamp: number
  displayArgs?: string
  ms?: number
  rawArgs: any[]
}

type LogListener = (entry: LogEntry) => void

const logListeners: LogListener[] = []

export const ServiceLogger = {
  /** Register a listener for all intercepted service logs */
  onLog(fn: LogListener) {
    logListeners.push(fn)
    return () => {
      const idx = logListeners.indexOf(fn)
      if (idx !== -1) logListeners.splice(idx, 1)
    }
  },

  /** @returns currently registered listener count */
  get _listenerCount() { return logListeners.length },

  /** Internal dispatch — called by Proxy interceptor */
  _fire(entry: LogEntry) {
    try {
      for (const fn of logListeners) fn(entry)
    } catch { /* fire-and-forget listeners */ }
  },

  /** Reset listeners (for testing only) */
  _resetListeners() {
    logListeners.length = 0
  },
}


/**
 * Wrap a service instance with AOP logging via Proxy.
 * Non-invasive: no modifications to the original service code needed.
 */
export function wrapWithLoggingProxy<T extends object>(
  obj: T,
  scope: string,
  logger: ILogger,
  options?: LogOptions & { filter?: (method: string) => boolean },
): T {

  if (!options || (!options.entry && !options.exit && !options.errors)) {
    return obj
  }

  const filter = options.filter ?? defaultMethodFilter

  return new Proxy(obj, {
    get(target, prop: string | symbol) {
      const raw = Reflect.get(target, prop)

      if (typeof raw !== 'function' || typeof prop !== 'string') {
        return raw
      }

      if (filter(prop)) {
        return raw
      }

      const originalFn = raw as (...args: any[]) => any

      const guardKey = `\x00_proxy_${prop}`
      if ((target as Record<string, unknown>)[guardKey]) {
        return raw
      }
      ;(target as Record<string, unknown>)[guardKey] = originalFn

      return function (this: any, ...args: any[]) {
        const t0 = performanceNow()
        let result: any
        let caughtError: unknown

        if (options.entry) {
          ServiceLogger._fire(createEntry(scope, prop, 'enter', t0, options.args ? buildArgsStr(args) : undefined))
        }

        try {
          result = originalFn.apply(this, args)

          if (options.perf || options.exit) {
            const ms = options.perf ? performanceNow() - t0 : undefined
            if (options.exit) {
              ServiceLogger._fire(createEntry(scope, prop, 'exit', t0, options.args ? buildArgsStr(args) : undefined, ms))
            }
          }
        } catch (err: any) {
          caughtError = err

          if (options.errors !== false) {
            const methodDisplay = prop.replace(/^get_/, 'get ').replace(/^set_/, 'set ')
            logger.error(
              `[${scope}] ${methodDisplay}()`,
              options.args ? `args: ${formatValue(args[0])}` : '',
              caughtError instanceof Error ? caughtError.message || caughtError.name : err,
            )
          }

          ServiceLogger._fire(createEntry(scope, prop, 'error', t0, options.args ? buildArgsStr(args) : undefined))

          throw caughtError
        }

        return result
      } as any
    },
  }) as T
}


/* ── Helpers ── */

const DIR_PREFIX: Record<LogEntry['direction'], string> = {
  enter: '▸',
  exit: '▹',
  error: '✗',
}

function defaultMethodFilter(methodName: string): boolean {
  if (methodName === '__proto__' || methodName === 'constructor' || methodName === 'toString') return true
  if (methodName.startsWith('_')) return true
  return false
}

function performanceNow() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
}

function truncate(v: unknown, maxLen: number): string {
  try {
    if (typeof v === 'string') return v.slice(0, maxLen)
    if (typeof v === 'object' && v !== null) {
      const s = JSON.stringify(v as object)
      return s.length > maxLen ? s.slice(0, maxLen) + '…' : s
    }
    return String(v ?? '')
  } catch {
    return '[unserializable]'
  }
}

function formatValue(v: unknown): string {
  return truncate(v, 200)
}

function buildArgsStr(args: any[]): string {
  if (!args?.length) return ''
  try {
    const formatted = args.map(a => truncate(a, 64))
    return ` [${formatted.join(', ')}]`
  } catch {
    return ' [...]'
  }
}

function createEntry(
  scope: string,
  method: string,
  direction: LogEntry['direction'],
  timestamp: number,
  displayArgs?: string,
  ms?: number,
): LogEntry {
  return {
    scope,
    method: `${DIR_PREFIX[direction]} ${method}()`,
    direction,
    timestamp,
    displayArgs,
    ms,
    rawArgs: [],
  }
}
