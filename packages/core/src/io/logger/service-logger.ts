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

  if (!options || !options.entry && !options.exit && !options.errors) {
    // No logging needed — return original object wrapped in identity Proxy (negligible overhead)
    return new Proxy(obj, { get: (t, p, r) => Reflect.get(t, p, r), set: (t, p, v, r) => Reflect.set(t, p, v, r) }) as T
  }

  const filter = options.filter ?? defaultMethodFilter

  return new Proxy(obj, {
    get(target, prop: string | symbol) {
      const raw = Reflect.get(target, prop)
        
      if (typeof raw !== 'function' || typeof prop !== 'string') {
        return raw
      }

      // Skip private fields (by convention starting with _) and proxy-internal keys
      if ((prop.startsWith('_') && !options?.entry) || filter(prop)) {
        return raw
      }

      const originalFn = raw as (...args: any[]) => any

      // Prevent infinite recursion for the exit logging timer cleanup
      const propKey = `\x00_proxy_${prop}`
      if ((target as Record<string, unknown>)[propKey]) {
        return raw
      }
      ;(target as Record<string, unknown>)[propKey] = originalFn

      return function (this: any, ...args: any[]) {
        const timeStart = performanceNow()
        let result: any
        let caughtError: unknown

        // ── entry log ──
        if (options.entry) {
          const displayArgs = options.args ? buildArgsStr(args, logger) : ''
          ServiceLogger._fire(createEntry(scope, prop, 'enter', timeStart, args, displayArgs))

          // Use queueMicrotask to let the actual call happen before `exit` fires immediately on next line
          // But we want sync exit too. We'll capture result below via try/finally and fire exit in next tick if no error
        }

        try {
          result = originalFn.apply(this, args)
          
          // ── exit / perf log (synchronous, immediate output) ──
          if (options.perf || options.exit) {
            const callEnd = performanceNow()
            const ms = options.perf ? callEnd - timeStart : undefined
            
            if (options.exit) {
              const displayArgs = options.args ? buildArgsStr(args, logger) : ''
              ServiceLogger._fire(createEntry(scope, prop, 'exit', timeStart, args, displayArgs, ms))
            }
          }
        } catch (err: any) {
          caughtError = err
          
          if (options.errors !== false) {
            const methodDisplay = prop.replace(/^get_/, 'get ').replace(/^set_/, 'set ')
            logger.error(
              `[${scope}] ${methodDisplay}()`,
              options.args ? `args: ${formatValue(args[0])}` : '',
              caughtError instanceof Error
                ? caughtError.message || caughtError.name
                : err
            )
          }

          // Fire error log entry too
          const displayArgs = options.args ? buildArgsStr(args, logger) : ''
          ServiceLogger._fire(createEntry(scope, prop, 'error', timeStart, args, displayArgs))

          throw caughtError
        }

        return result
      } as any
    },
  }) as T
}


/* ── Helpers ── */

function defaultMethodFilter(methodName: string): boolean {
  if (methodName === '__proto__' || methodName === 'constructor' || methodName === 'toString') return true
  if (methodName.startsWith('_')) return true
  // Skip methods that are themselves proxies or internal framework helpers
  return false
}

function performanceNow() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
}

function buildArgsStr(args: any[], logger: ILogger): string {
  if (!args?.length) return ''
  try {
    const formatted = args.map(a => typeof a === 'object' ? JSON.stringify(a).slice(0, 64) : String(a))
    return ` [${formatted.join(', ')}]`
  } catch {
    return ' [...]'
  }
}

function formatValue(v: unknown): string {
  try {
    if (typeof v === 'string') return v.slice(0, 200)
    if (typeof v === 'object' && v !== null) {
      const s = JSON.stringify(v as object)
      return s.length > 200 ? s.slice(0, 200) + '…' : s
    }
    return String(v ?? '')
  } catch {
    return '[unserializable]'
  }
}

function createEntry(
  scope: string,
  method: string,
  direction: LogEntry['direction'],
  timestamp: number,
  _rawArgs: any[],
  displayArgs?: string,
  ms?: number,
): LogEntry {
  return {
    scope,
    method: direction === 'enter' ? `▸ ${method}()` : direction === 'exit' ? `▹ ${method}()` : `✗ ${method}()`,
    direction,
    timestamp,
    displayArgs,
    ms,
    rawArgs: _rawArgs,
  }
}
