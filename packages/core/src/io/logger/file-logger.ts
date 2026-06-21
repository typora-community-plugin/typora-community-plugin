import { _options } from 'typora'
import fs from "src/io/fs/filesystem"
import path from "src/path"
import { noop } from "src/utils"


const DEFAULT_BUFFER_SIZE = 99 * 1024 // 99KB to avoid frequent disk IO

export function createFileLogger(logFile: string): FileLogger {
  const logger = new FileLogger(logFile)

  if (process.env.IS_PROD) {
    return logger
  }

  // In dev, flush logs periodically for real-time debugging
  const timer = setInterval(() => {
    logger.flush().catch(noop)
  }, 5000)
  timer?.unref?.() // Don't prevent process exit

  return logger
}


export class FileLogger {

  #buffer = ''

  constructor(private readonly logFile: string) {}

  log(level: string, ...messages: any[]) {
    const msgStr = messages.map(m =>
      typeof m === 'object' ? JSON.stringify(m) : String(m)
    ).join(' ')

    const timestamp = new Date().toISOString()
    this.#buffer += `[${timestamp}] ${level.padEnd(5)} ${msgStr}\n`

    // Keep buffer within bounds — truncate oldest lines when too large
    while (this.#buffer.length > DEFAULT_BUFFER_SIZE) {
      const nl = this.#buffer.indexOf('\n')
      if (nl === -1) this.#buffer = ''
      else this.#buffer = this.#buffer.slice(nl + 1)
    }
  }

  get hasData(): boolean {
    return !!this.#buffer.length
  }

  flush(): Promise<void> {
    if (!this.hasData) return Promise.resolve()

    const content = this.#buffer
    this.#buffer = ''

    const dirPath = path.dirname(this.logFile)
    return fs.mkdir(dirPath).catch(noop)
      .then(() => fs.appendText(this.logFile, content))
      .catch(noop)
  }
}


// ---- Module-level singleton for dev file logging ----

let _devInstance: FileLogger | undefined

export function getOrCreateDevLogger(): FileLogger {
  const logFile = resolveDevLogFile()
  if (!logFile) return new NoopFileLogger()

  // @ts-ignore Re-check cache in case mount folder changed since last call
  if (_devInstance && _devInstance.logFile === logFile) return _devInstance

  _devInstance?.flush()
  _devInstance = createFileLogger(logFile)

  // Ensure directory exists
  const logDir = path.dirname(logFile)
  fs.mkdir(logDir).catch(noop)

  return _devInstance
}

function resolveDevLogFile(): string {
  const mountFolder = (globalThis as any).File?.getMountFolder()
    ?? _options?.mountFolder
    ?? path.dirname((globalThis as any).File?.bundle?.filePath ?? '')

  if (!mountFolder) return ''

  return path.join(mountFolder, '.typora', '__plugin-logger.log')
}

class NoopFileLogger extends FileLogger {
  constructor() { super('') }
  log() {}
}
