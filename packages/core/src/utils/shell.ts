import { bridge, File } from "typora"


export class Shell {
  private constructor() { }

  static run(
    cmd: string,
    opts: { cwd: string } = { cwd: File.getMountFolder() }
  ) {
    return new Promise((resolve, reject) => {
      bridge.callHandler(
        "controller.runCommand",
        { ...opts, args: cmd },
        ([success, out, error, cmd]) => {
          success ? resolve(out) : reject(new Error(error))
        })
    })
  }

  static escape(text: string) {
    return "'" + text.replace(/'/g, "'\\''") + "'"
  }
}
