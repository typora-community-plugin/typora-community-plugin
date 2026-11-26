import 'src/setup-test-env'
import { beforeAll, describe, expect, test, vi } from 'vitest'


const fsMock = {
  mkdir: vi.fn(async (_dir: string) => { }),
  appendText: vi.fn(async (_file: string, _content: string) => { }),
}

let fileLogger: typeof import('src/io/logger/file-logger')

beforeAll(async () => {
  await vi.doMock('src/common/constants', () => ({ platform: () => 'darwin' }))
  await vi.doMock('src/io/fs/filesystem', () => ({ default: fsMock }))
  fileLogger = await import('src/io/logger/file-logger')
})


describe('dev logger on macOS', () => {

  test('never touches the file system, leaving console as the only sink', async () => {
    ;(globalThis as any).File = { getMountFolder: () => '/vault' }

    const logger = fileLogger.getOrCreateDevLogger()
    logger.log('INFO', 'dev')
    await logger.flush()

    expect(logger.hasData).toBe(false)
    expect(fsMock.mkdir).not.toHaveBeenCalled()
    expect(fsMock.appendText).not.toHaveBeenCalled()
  })
})
