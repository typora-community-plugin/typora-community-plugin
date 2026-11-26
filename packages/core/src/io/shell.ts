import { _options, bridge, File } from "typora"


function defaultCwd() {
  return File.getMountFolder?.() || _options?.userDataPath || '/'
}


/**
 * Typora's native command approval dialog was cancelled by the user.
 */
export class CommandCancelledError extends Error {
  readonly cancelled = true

  constructor(message = 'Command cancelled.') {
    super(message)
    this.name = 'CommandCancelledError'
  }
}

export function isCommandCancelled(error: unknown): error is CommandCancelledError {
  return error instanceof CommandCancelledError
    || (error instanceof Error && /command cancelled/i.test(error.message))
}


export class Shell {
  /**
   * On macOS Typora shows one approval dialog per `controller.runCommand` call,
   * and rejects other calls while a dialog is open. Run commands one at a time
   * so concurrent file operations do not fail with "approval is unavailable".
   */
  private static _queue: Promise<unknown> = Promise.resolve()

  private constructor() { }

  static run(
    cmd: string,
    opts: { cwd: string } = { cwd: defaultCwd() }
  ) {
    const execute = () => new Promise((resolve, reject) => {
      bridge.callHandler(
        "controller.runCommand",
        { ...opts, args: cmd },
        ([success, out, error, cmd]) => {
          if (success) {
            resolve(out)
            return
          }

          const message = error || `Command failed: ${cmd}`
          reject(/command cancelled/i.test(message)
            ? new CommandCancelledError(message)
            : new Error(message))
        })
    })

    if (!File.isMac) {
      return execute()
    }

    const result = Shell._queue.then(execute, execute)
    Shell._queue = result.then((): undefined => undefined, (): undefined => undefined)
    return result
  }

  static escape(text: string) {
    return `'${text.replace(/'/g, "'\\''")}'`
  }
}
