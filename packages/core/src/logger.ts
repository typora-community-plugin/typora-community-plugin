type Level = {
  method: 'debug' | 'info' | 'warn' | 'error',
  tag: string,
  bgColor: string,
}

const LogLevel: Record<string, Level> = {
  DEBUG: { method: 'debug', tag: 'DEBUG', bgColor: 'gray' },
  INFO: { method: 'info', tag: 'INFO', bgColor: 'blue' },
  WARN: { method: 'warn', tag: 'WARN', bgColor: 'gold' },
  ERROR: { method: 'error', tag: 'ERROR', bgColor: 'red' },
}

export class Logger {

  constructor(private scope: string) {
  }

  private log(level: Level, messages: any[]) {
    const time = new Date().toISOString().slice(11, -5);

    console[level.method](
      `${time} %c${level.tag}%c [${this.scope}]`,
      `color:white; background:${level.bgColor}; padding:3px 5px;`,
      'color:unset; background:unset; padding:unset;',
      ...messages
    );
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
