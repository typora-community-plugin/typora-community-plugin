import { getOrCreateDevLogger } from './file-logger'


type Level = {
  method: 'debug' | 'info' | 'warn' | 'error',
  tag: string,
  bgColor: string,
}

const LogLevel: Record<string, Level> = {
  DEBUG: { method: 'debug', tag: 'DEBUG', bgColor: 'dimgray' },
  INFO: { method: 'info', tag: 'INFO', bgColor: 'steelblue' },
  WARN: { method: 'warn', tag: 'WARN', bgColor: 'darkorange' },
  ERROR: { method: 'error', tag: 'ERROR', bgColor: 'firebrick' },
}


export function badge(message: string, bgColor: string): [string, string, string] {
  return [
    `%c${message}%c `,
    `color:#fff; background:${bgColor}; padding: 2px 4px; border-radius: 4px;`,
    // reset styles
    'color:unset; background:unset; padding:unset; border-radius:unset;',
  ]
}

export function badges(...messages: Array<[string, string, string] | undefined>) {
  const result: (string | undefined)[] = ['']
  for (const badge of messages) {
    if (!badge) continue
    result[0] += badge[0]
    result.push(badge[1], badge[2])
  }
  return result as unknown as [string, string, string]
}

export interface ILogger {
  debug(...messages: any[]): void
  info(...messages: any[]): void
  warn(...messages: any[]): void
  error(...messages: any[]): void
}

export class Logger {

  constructor(public scope?: string) {
  }

  private log(level: Level, messages: any[]) {
    if (process.env.IS_DEV) {
      const devLogger = getOrCreateDevLogger()
      devLogger.log(level.tag, this.scope ? `[${this.scope}]` : '', ...messages)
    }

    console[level.method](
      ...badges(
        badge('[Typora Plugin]', level.bgColor),
        !!this.scope ? badge(this.scope, 'gray') : undefined),
      ...messages
    )
  }

  debug(...messages: any[]) { this.log(LogLevel.DEBUG, messages) }
  info(...messages: any[]) { this.log(LogLevel.INFO, messages) }
  warn(...messages: any[]) { this.log(LogLevel.WARN, messages) }
  error(...messages: any[]) { this.log(LogLevel.ERROR, messages) }
}
