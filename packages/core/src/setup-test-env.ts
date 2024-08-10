import { registerService } from "./common/service"
import type { ConfigStorage } from "./io/config-storage"


registerService('logger', () =>
  new class { debug() { } info() { } warn() { } error() { } }
)

registerService('config-storage', () =>
  new class implements ConfigStorage {
    readConfigJson(filename: string, defaultValue?: any) {
      return defaultValue
    }
    writeConfigJson(filename: string, config: any): Promise<void> {
      return Promise.resolve()
    }
  }
)
