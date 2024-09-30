import { _options } from "typora"
import path from "src/path"
import { constant } from "src/utils"


export const coreVersion = constant(process.env.CORE_VERSION)

export const globalRootDir = constant(
  process.env.IS_PROD
    ? path.join(_options.userDataPath, 'plugins')
    : import.meta.url.slice(8, -7)
)

export const coreDir = constant(
  process.env.IS_PROD
    ? path.join(globalRootDir(), coreVersion())
    : process.env.IS_DEV
      ? import.meta.url.slice(8, -7)
      : ''
)

export const globalConfigDir = constant(
  path.join(globalRootDir(), 'settings')
)

export const platform = constant(
  (globalThis?.process?.platform as 'win32' | 'linux') ?? 'darwin'
)

export const isDebug = constant(
  process.env.IS_PROD
    // @ts-ignore
    ? globalThis[Symbol.for(`${process.env.CORE_NS}:env`)].debug
    : process.env.IS_DEV
)
