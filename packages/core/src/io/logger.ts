import { registerService } from "src/common/service"
import { memorize } from "src/utils/function/memorize"
import { identity } from "src/utils/identity"


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

const RESET_STYLES = 'color:unset; background:unset; padding:unset; border-radius:unset;'

function badage(message: string, bgColor: string): [string, string, string] {
  return [
    `%c${message}%c `,
    `color:#fff; background:${bgColor}; padding: 2px 4px; border-radius: 4px;`,
    RESET_STYLES,
  ]
}

function badages(...messages: [string, string, string][]) {
  return messages
    .filter(identity)
    .reduce((acc, b) => {
      acc[0] += b[0]
      acc.push(b[1], b[2])
      return acc
    }, [''])
}


registerService('logger', memorize(([scope]) => new Logger(scope)))

export class Logger {

  constructor(public scope?: string) {
  }

  private log(level: Level, messages: any[]) {
    console[level.method](
      ...badages(
        badage('[Typora Plugin]', level.bgColor),
        this.scope && badage(this.scope, 'gray')),
      ...messages
    )
  }

  debug(...messages: any[]) {
    this.log(LogLevel.DEBUG, messages)
  }

  info(...messages: any[]) {
    this.log(LogLevel.INFO, messages)
  }

  warn(...messages: any[]) {
    this.log(LogLevel.WARN, messages)
  }

  error(...messages: any[]) {
    this.log(LogLevel.ERROR, messages)
  }
}
