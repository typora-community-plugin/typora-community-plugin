import path from 'src/path'
import { _options, bridge } from 'typora'
import { HELPER_PROTOCOL, type HelperRuntime } from './protocol'


export function helperDataDir() {
  return path.join(_options.userDataPath, 'plugins', '_helper')
}

export function runtimePath() {
  return path.join(helperDataDir(), 'runtime.json')
}

/**
 * Reads `runtime.json` written by the helper.
 *
 * `path.readText` is a synchronous bridge call: no shell command, no approval
 * dialog. It throws (or returns an empty string) when the file is missing.
 */
export function readRuntime(): HelperRuntime | null {
  let text: string
  try {
    text = bridge.callSync('path.readText', runtimePath())
  }
  catch {
    return null
  }

  if (!text) return null

  try {
    const runtime = JSON.parse(text) as HelperRuntime
    if (typeof runtime?.port !== 'number' || typeof runtime?.token !== 'string') return null
    if (typeof runtime.protocol !== 'number' || runtime.protocol < HELPER_PROTOCOL) return null
    return runtime
  }
  catch {
    return null
  }
}
