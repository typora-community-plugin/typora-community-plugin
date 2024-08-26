import { jest } from '@jest/globals'
import { registerService } from "./common/service"
import { memorize } from "./utils/function/memorize"


// @ts-ignore
globalThis['window'] = {}

registerService('logger', memorize(() =>
  new class { debug() { } info() { } warn() { } error() { } }
))

registerService('app', memorize(() => (
  {
    on: jest.fn(),
    emit: jest.fn(),
  } as any
)))

registerService('config-repository', memorize(() => (
  {
    readConfigJson: jest.fn()
      .mockImplementation((filename, defaultValue) => defaultValue),
    writeConfigJson: jest.fn(),
  } as any
)))

registerService('hotkey-manager', memorize(() => (
  {
    addHotkey: jest.fn().mockReturnValue(jest.fn()),
    addEditorHotkey: jest.fn().mockReturnValue(jest.fn()),
  } as any
)))
