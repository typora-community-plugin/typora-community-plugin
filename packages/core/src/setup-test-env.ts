import { jest } from '@jest/globals'
import { registerService } from "./common/service"
import type { ConfigStorage } from "./io/config-storage"
import { memorize } from "./utils/function/memorize"


registerService('logger', memorize(() =>
  new class { debug() { } info() { } warn() { } error() { } }
))

registerService('app', memorize(() => (
  {
    on: jest.fn(),
    emit: jest.fn(),
  } as any
)))

registerService('config-storage', memorize(() =>
  new class implements ConfigStorage {
    readConfigJson(filename: string, defaultValue?: any) {
      return defaultValue
    }
    writeConfigJson(filename: string, config: any): Promise<void> {
      return Promise.resolve()
    }
  }
))

registerService('hotkey-manager', memorize(() => (
  {
    addHotkey: jest.fn().mockReturnValue(jest.fn()),
    addEditorHotkey: jest.fn().mockReturnValue(jest.fn()),
  } as any
)))
