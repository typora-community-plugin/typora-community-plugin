import { _options } from "typora"
import path from "src/path"
import { constant } from "src/utils/constant"


export const coreVersion = constant(process.env.CORE_VERSION)

export const coreDir = constant(
  process.env.IS_DEV
    ? import.meta.url.slice(8, -7)
    : path.join(_options.userDataPath, 'plugins', coreVersion())
)

export const platform = constant(
  (window?.process?.platform as 'win32' | 'linux') ?? 'darwin'
)
