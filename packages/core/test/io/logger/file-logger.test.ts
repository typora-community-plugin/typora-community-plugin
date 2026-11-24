import 'src/setup-test-env'
import { beforeEach, describe, expect, test, vi } from 'vitest'


const fsMock = {
  mkdir: vi.fn(async (_dir: string) => { }),
  appendText: vi.fn(async (_file: string, _content: string) => { }),
}

let fileLogger: typeof import('src/io/logger/file-logger')

beforeAll(async () => {
  await vi.doMock('src/io/fs/filesystem', () => ({ default: fsMock }))
  fileLogger = await import('src/io/logger/file-logger')
})

beforeEach(() => {
  fsMock.mkdir.mockReset().mockResolvedValue(undefined)
  fsMock.appendText.mockReset().mockResolvedValue(undefined)
  vi.useRealTimers()
})


describe('FileLogger', () => {

  test('formats records with an ISO timestamp, padded level and stringified objects', async () => {
    const logger = new fileLogger.FileLogger('/logs/main.log')

    expect(logger.hasData).toBe(false)

    logger.log('INFO', 'hello', { a: 1 }, 2)
    expect(logger.hasData).toBe(true)

    await logger.flush()

    expect(fsMock.appendText).toHaveBeenCalledTimes(1)
    const [file, content] = fsMock.appendText.mock.calls[0]

    expect(file).toBe('/logs/main.log')
    expect(content).toMatch(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] INFO {2}hello \{"a":1\} 2\n$/)
  })

  test('flush is a no-op without buffered data', async () => {
    const logger = new fileLogger.FileLogger('/logs/main.log')

    await expect(logger.flush()).resolves.toBeUndefined()

    expect(fsMock.mkdir).not.toHaveBeenCalled()
    expect(fsMock.appendText).not.toHaveBeenCalled()
  })

  test('creates the log directory before appending', async () => {
    const logger = new fileLogger.FileLogger('/logs/nested/main.log')

    logger.log('WARN', 'w')
    await logger.flush()

    expect(fsMock.mkdir).toHaveBeenCalledWith('/logs/nested')
    expect(fsMock.appendText).toHaveBeenCalledWith('/logs/nested/main.log', expect.stringContaining('WARN'))
  })

  test('still appends when creating the directory fails', async () => {
    fsMock.mkdir.mockRejectedValueOnce(new Error('read-only'))
    const logger = new fileLogger.FileLogger('/logs/main.log')

    logger.log('ERROR', 'e')
    await logger.flush()

    expect(fsMock.appendText).toHaveBeenCalledTimes(1)
  })

  test('swallows append failures', async () => {
    fsMock.appendText.mockRejectedValueOnce(new Error('disk full'))
    const logger = new fileLogger.FileLogger('/logs/main.log')

    logger.log('DEBUG', 'd')
    await expect(logger.flush()).resolves.toBeUndefined()
  })

  test('truncates the oldest lines when the buffer grows past 99KB', async () => {
    const logger = new fileLogger.FileLogger('/logs/main.log')
    const line = 'x'.repeat(10_000)

    for (let i = 0; i < 20; i++) logger.log('INFO', line)
    await logger.flush()

    const content = fsMock.appendText.mock.calls[0][1] as string
    expect(content.length).toBeLessThanOrEqual(99 * 1024)
    expect(content.endsWith('\n')).toBe(true)
  })

  test('drops a single overlong record that has no earlier line break', async () => {
    const logger = new fileLogger.FileLogger('/logs/main.log')

    logger.log('INFO', 'x'.repeat(200_000))

    expect(logger.hasData).toBe(false)
  })
})


describe('dev logger singleton', () => {

  // This block must run after the "no mount folder" case: the module caches its
  // instance between calls, and a dev logger created earlier would be reused.
  test('creates a logger when File provides a mount folder', () => {
    (globalThis as any).File = { getMountFolder: () => '/vault' }
    delete (globalThis as any)._options

    const logger = fileLogger.getOrCreateDevLogger()

    logger.log('INFO', 'ignored')
    expect(logger.hasData).toBe(true)
  })

  test('reuses the instance for the same mount folder', () => {
    ;(globalThis as any).File = { getMountFolder: () => '/vault' }

    const first = fileLogger.getOrCreateDevLogger()
    const second = fileLogger.getOrCreateDevLogger()

    expect(second).toBe(first)
  })

  test('writes buffered logs to the mount folder', async () => {
    ;(globalThis as any).File = { getMountFolder: () => '/vault' }
    fsMock.appendText.mockClear()

    const logger = fileLogger.getOrCreateDevLogger()
    logger.log('INFO', 'dev')
    await logger.flush()

    expect(fsMock.appendText).toHaveBeenCalledWith(
      expect.stringMatching(/\/vault\/\.typora\/__plugin-logger\.log$/),
      expect.stringContaining('dev'),
    )
  })

  test('flushes the old instance and switches when the mount folder changes', async () => {
    ;(globalThis as any).File = { getMountFolder: () => '/vault' }
    const previous = fileLogger.getOrCreateDevLogger()
    previous.log('INFO', 'from-vault')
    fsMock.appendText.mockClear()

    ;(globalThis as any).File = { getMountFolder: () => '/other' }
    const next = fileLogger.getOrCreateDevLogger()

    expect(next).not.toBe(previous)
    // The previous instance was flushed asynchronously; wait for the append.
    await vi.waitFor(() => {
      expect(fsMock.appendText).toHaveBeenCalledWith(
        expect.stringContaining('__plugin-logger.log'),
        expect.stringContaining('from-vault'),
      )
    })
  })

  test('prefers File.getMountFolder() over _options.mountFolder', () => {
    ;(globalThis as any)._options = { mountFolder: '/from-options' }
    ;(globalThis as any).File = { getMountFolder: () => '/from-file' }

    const logger = fileLogger.getOrCreateDevLogger()

    ;(globalThis as any).File = undefined
    delete (globalThis as any)._options

    // The dev log file path is private, but creating a different instance for
    // the same folder proves the OS file branch resolved a stable path.
    ;(globalThis as any)._options = { mountFolder: '/from-file' }
    expect(fileLogger.getOrCreateDevLogger()).toBe(logger)
  })
})
