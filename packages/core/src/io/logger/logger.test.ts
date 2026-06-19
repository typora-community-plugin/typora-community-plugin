import 'src/setup-test-env'
import { jest } from '@jest/globals'
import { Logger, badage, badages } from './logger'

describe('badage', () => {
  test('creates badge with correct format', () => {
    const result = badage('Test', 'red')

    expect(result).toHaveLength(3)
    expect(result[0]).toBe('%cTest%c ')
    expect(result[1]).toContain('color:#fff; background:red;')
    expect(result[2]).toBe('color:unset; background:unset; padding:unset; border-radius:unset;')
  })

  test('includes CSS styles in badge', () => {
    const result = badage('DEBUG', 'dimgray')

    expect(result[1]).toContain('padding: 2px 4px;')
    expect(result[1]).toContain('border-radius: 4px;')
  })
})

describe('badages', () => {
  test('combines multiple badges correctly', () => {
    const badge1 = badage('First', 'red')
    const badge2 = badage('Second', 'blue')

    const result = badages(badge1, badge2)

    expect(result[0]).toBe('%cFirst%c %cSecond%c ')
    expect(result).toHaveLength(5) // [template, style1, reset, style2, reset]
  })

  test('filters out falsy badges', () => {
    const badge1 = badage('First', 'red')
    const badge2 = null as any

    const result = badages(badge1, badge2)

    expect(result[0]).toBe('%cFirst%c ')
    expect(result).toHaveLength(3)
  })

  test('handles empty array', () => {
    const result = badages()

    expect(result[0]).toBe('')
    expect(result).toHaveLength(1)
  })
})

describe('Logger', () => {
  let consoleSpy: {
    debug: jest.SpiedFunction<typeof console.debug>
    info: jest.SpiedFunction<typeof console.info>
    warn: jest.SpiedFunction<typeof console.warn>
    error: jest.SpiedFunction<typeof console.error>
  }

  beforeEach(() => {
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore())
  })

  describe('constructor', () => {
    test('creates logger without scope', () => {
      const logger = new Logger()

      expect(logger.scope).toBeUndefined()
    })

    test('creates logger with scope', () => {
      const logger = new Logger('TestScope')

      expect(logger.scope).toBe('TestScope')
    })
  })

  describe('debug', () => {
    test('calls console.debug with correct parameters', () => {
      const logger = new Logger('TestScope')

      logger.debug('test message', 123)

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1)
      const callArgs = consoleSpy.debug.mock.calls[0]

      expect(callArgs[0]).toContain('[Typora Plugin]')
      expect(callArgs[0]).toContain('TestScope')
      expect(callArgs[callArgs.length - 2]).toBe('test message')
      expect(callArgs[callArgs.length - 1]).toBe(123)
    })

    test('calls console.debug without scope', () => {
      const logger = new Logger()

      logger.debug('test message')

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1)
      const callArgs = consoleSpy.debug.mock.calls[0]

      expect(callArgs[0]).toContain('[Typora Plugin]')
      // Should not contain scope badge when scope is undefined
    })
  })

  describe('info', () => {
    test('calls console.info with correct parameters', () => {
      const logger = new Logger('TestScope')

      logger.info('info message', { data: 'test' })

      expect(consoleSpy.info).toHaveBeenCalledTimes(1)
      const callArgs = consoleSpy.info.mock.calls[0]

      expect(callArgs[0]).toContain('[Typora Plugin]')
      expect(callArgs[0]).toContain('TestScope')
      expect(callArgs[callArgs.length - 2]).toBe('info message')
      expect(callArgs[callArgs.length - 1]).toEqual({ data: 'test' })
    })
  })

  describe('warn', () => {
    test('calls console.warn with correct parameters', () => {
      const logger = new Logger('TestScope')

      logger.warn('warning message')

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1)
      const callArgs = consoleSpy.warn.mock.calls[0]

      expect(callArgs[0]).toContain('[Typora Plugin]')
      expect(callArgs[0]).toContain('TestScope')
      expect(callArgs[callArgs.length - 1]).toBe('warning message')
    })
  })

  describe('error', () => {
    test('calls console.error with correct parameters', () => {
      const logger = new Logger('TestScope')

      logger.error('error message', new Error('test error'))

      expect(consoleSpy.error).toHaveBeenCalledTimes(1)
      const callArgs = consoleSpy.error.mock.calls[0]

      expect(callArgs[0]).toContain('[Typora Plugin]')
      expect(callArgs[0]).toContain('TestScope')
      expect(callArgs[callArgs.length - 2]).toBe('error message')
      expect(callArgs[callArgs.length - 1]).toBeInstanceOf(Error)
    })
  })

  describe('multiple messages', () => {
    test('handles multiple messages correctly', () => {
      const logger = new Logger()

      logger.info('first', 'second', 'third')

      expect(consoleSpy.info).toHaveBeenCalledTimes(1)
      const callArgs = consoleSpy.info.mock.calls[0]

      // Should include all three messages at the end
      expect(callArgs[callArgs.length - 3]).toBe('first')
      expect(callArgs[callArgs.length - 2]).toBe('second')
      expect(callArgs[callArgs.length - 1]).toBe('third')
    })
  })

  describe('empty messages', () => {
    test('handles empty message array', () => {
      const logger = new Logger()

      logger.info()

      expect(consoleSpy.info).toHaveBeenCalledTimes(1)
      const callArgs = consoleSpy.info.mock.calls[0]

      // Should still call with badge but no additional messages
      expect(callArgs[0]).toContain('[Typora Plugin]')
    })
  })
})
