import 'src/setup-test-env'
import { jest, describe, expect, test } from '@jest/globals'
import { useService } from './service'

describe('useService()', () => {
  describe('singleton behavior', () => {
    test('should return the same logger instance across calls', () => {
      const s1 = useService('logger')
      const s2 = useService('logger')
      expect(s1).toBe(s2)
    })

    test('should return the same config-repository instance across calls', () => {
      const s1 = useService('config-repository')
      const s2 = useService('config-repository')
      expect(s1).toBe(s2)
    })

    test('should return different instances for different service types', () => {
      const config = useService('config-repository')
      const hotkey = useService('hotkey-manager')
      expect(config).not.toBe(hotkey)
    })
  })

  describe('registered services behavior', () => {
    test('should return logger with logging methods', () => {
      const logger = useService('logger')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })

    test('should return app with on and emit methods', () => {
      const app = useService('app')
      expect(typeof app.on).toBe('function')
      expect(typeof app.emit).toBe('function')
    })

    test('should return config-repository with expected API', () => {
      const config = useService('config-repository')
      expect(typeof config.configDir).toBe('string')
      expect(config.configDir).toBe('/default-config-dir')
      expect(typeof config.setConfigDir).toBe('function')
      expect(typeof config.readConfigJson).toBe('function')
      expect(typeof config.writeConfigJson).toBe('function')
    })

    test('config-repository should allow changing configDir', () => {
      const config = useService('config-repository')
      config.setConfigDir('/custom')
      expect(config.configDir).toBe('/custom')
    })

    test('hotkey-manager should return mock dispose functions from hotkey methods', () => {
      const hk = useService('hotkey-manager')
      const dispose1 = hk.addHotkey({} as any)
      const dispose2 = hk.addEditorHotkey({} as any)
      expect(typeof dispose1).toBe('function')
      expect(typeof dispose2).toBe('function')
    })
  })

  describe('isolation between services', () => {
    test('should not have state leakage between logger and config-repository', () => {
      const logger = useService('logger')
      const config = useService('config-repository')
      // Modify config without affecting logger
      config.setConfigDir('/isolated')
      expect(config.configDir).toBe('/isolated')
      // Logger should still have its own identity
      expect(logger).toBeDefined()
    })
  })
})
