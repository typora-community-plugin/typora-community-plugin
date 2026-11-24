import 'src/setup-test-env'
import { EventEmitter } from 'node:events'
import { registerService } from 'src/common/service'
import { describe, expect, test, vi } from 'vitest'


const fsMock = {
  mkdir: vi.fn(async () => { }),
  remove: vi.fn(async () => { }),
  access: vi.fn(async () => { }),
}

const unzipMock = vi.fn(async () => { })
const shellRun = vi.fn(async () => '')
const notice = vi.fn()

let net: typeof import('src/net/net')

beforeAll(async () => {
  await vi.doMock('src/io/fs/filesystem', () => ({ default: fsMock }))
  await vi.doMock('src/io/zlib', () => ({ unzip: unzipMock }))
  await vi.doMock('src/io/shell', () => ({ Shell: { run: shellRun } }))
  net = await import('src/net/net')
})

beforeEach(() => {
  fsMock.mkdir.mockClear().mockResolvedValue(undefined)
  fsMock.remove.mockClear().mockResolvedValue(undefined)
  fsMock.access.mockClear().mockResolvedValue(undefined)
  unzipMock.mockClear().mockResolvedValue(undefined)
  shellRun.mockClear().mockResolvedValue('')
  notice.mockClear()

  ;(globalThis as any)._options = { userDataPath: '/user' }
  delete (globalThis as any).File
  delete (globalThis as any).JSBridge
  delete (globalThis as any).__reqnode

  registerService('i18n', (() => ({
    t: { net: { fileDownloadFailed: 'download failed' } },
  })) as any)
  registerService('notice', ((args: any[]) => notice(...args)) as any)
})

afterEach(() => {
  delete (globalThis as any)._options
  delete (globalThis as any).File
  delete (globalThis as any).JSBridge
  delete (globalThis as any).__reqnode
})


describe('downloadThenUnzipToTemp() in the browser', () => {

  test('downloads with curl, unzips and removes the archive', async () => {
    const result = await net.downloadThenUnzipToTemp('https://example.com/plugin.zip')

    expect(fsMock.mkdir).toHaveBeenCalledWith('/user/plugins/_temp')
    expect(shellRun).toHaveBeenCalledWith(
      "curl -fLsS 'https://example.com/plugin.zip' -o '/user/plugins/_temp/1.zip'",
    )
    expect(fsMock.access).toHaveBeenCalledWith('/user/plugins/_temp/1.zip')
    expect(unzipMock).toHaveBeenCalledWith('/user/plugins/_temp/1.zip', '/user/plugins/_temp/1')
    expect(fsMock.remove).toHaveBeenCalledWith('/user/plugins/_temp/1.zip')
    expect(result).toBe('/user/plugins/_temp/1')
  })

  test('stops when creating the temp folder fails', async () => {
    fsMock.mkdir.mockRejectedValueOnce(new Error('denied'))

    await expect(net.downloadThenUnzipToTemp('https://example.com/p.zip'))
      .rejects.toThrow('denied')

    expect(shellRun).not.toHaveBeenCalled()
  })

  test('reports a failed download when the file is missing', async () => {
    fsMock.access.mockRejectedValueOnce(new Error('ENOENT'))

    await expect(net.downloadThenUnzipToTemp('https://example.com/p.zip'))
      .rejects.toThrow('ENOENT')

    expect(notice).toHaveBeenCalledWith('download failed', 0)
  })

  test('propagates a failed unzip', async () => {
    unzipMock.mockRejectedValueOnce(new Error('bad zip'))

    await expect(net.downloadThenUnzipToTemp('https://example.com/p.zip'))
      .rejects.toThrow('bad zip')

    // The archive is only removed after a successful extraction.
    expect(fsMock.remove).not.toHaveBeenCalled()
  })
})


describe('downloadThenUnzipToTemp() on Node.js', () => {

  test('delegates to the Typora downloader when configured', async () => {
    ;(globalThis as any).File = { isNode: true }
    ;(globalThis as any).JSBridge = { invoke: vi.fn(async () => { }) }
    registerService('settings', (() => ({
      get: () => net.Downloader.Typora,
    })) as any)

    await net.downloadThenUnzipToTemp('https://example.com/p.zip')

    expect((globalThis as any).JSBridge.invoke).toHaveBeenCalledWith(
      'app.download',
      'https://example.com/p.zip',
      '/user/plugins/_temp',
      expect.stringMatching(/^\d+\.zip$/),
    )
  })

  test('streams the file with the Node.js downloader', async () => {
    ;(globalThis as any).File = { isNode: true }
    registerService('settings', (() => ({
      get: () => net.Downloader.Nodejs,
    })) as any)

    const { stream, get } = installNodeFetch(() => createResponse({}))
    ;(globalThis as any).__reqnode = (id: string) => id === 'https'
      ? { get }
      : { createWriteStream: () => stream, unlink: vi.fn() }

    await net.downloadThenUnzipToTemp('https://example.com/p.zip')

    expect(get).toHaveBeenCalledWith('https://example.com/p.zip', expect.any(Function))
    expect(stream.close).toHaveBeenCalled()
  })

  test('follows redirects', async () => {
    ;(globalThis as any).File = { isNode: true }
    registerService('settings', (() => ({
      get: () => net.Downloader.Nodejs,
    })) as any)

    let call = 0
    const { stream, get } = installNodeFetch(() => {
      call++
      return call === 1
        ? createResponse({ statusCode: 302, location: '/moved.zip' })
        : createResponse({})
    })
    ;(globalThis as any).__reqnode = (id: string) => id === 'https'
      ? { get }
      : { createWriteStream: () => stream, unlink: vi.fn() }

    await net.downloadThenUnzipToTemp('https://example.com/p.zip')

    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[1][0]).toBe('https://example.com/moved.zip')
  })

  test('rejects a redirect without a location header', async () => {
    ;(globalThis as any).File = { isNode: true }
    registerService('settings', (() => ({
      get: () => net.Downloader.Nodejs,
    })) as any)

    const { stream, get } = installNodeFetch(() => createResponse({ statusCode: 301 }))
    ;(globalThis as any).__reqnode = (id: string) => id === 'https'
      ? { get }
      : { createWriteStream: () => stream, unlink: vi.fn() }

    await expect(net.downloadThenUnzipToTemp('https://example.com/p.zip'))
      .rejects.toThrow('Redirect location header missing')

    expect(notice).toHaveBeenCalledWith('Redirect location header missing', 0)
  })

  test('rejects after too many redirects', async () => {
    ;(globalThis as any).File = { isNode: true }
    registerService('settings', (() => ({
      get: () => net.Downloader.Nodejs,
    })) as any)

    const { stream, get } = installNodeFetch(() => createResponse({ statusCode: 302, location: '/loop' }))
    ;(globalThis as any).__reqnode = (id: string) => id === 'https'
      ? { get }
      : { createWriteStream: () => stream, unlink: vi.fn() }

    await expect(net.downloadThenUnzipToTemp('https://example.com/p.zip'))
      .rejects.toThrow('Too many redirects')

    expect(get).toHaveBeenCalledTimes(6)
  })

  test('rejects a non-success response', async () => {
    ;(globalThis as any).File = { isNode: true }
    registerService('settings', (() => ({
      get: () => net.Downloader.Nodejs,
    })) as any)

    const { stream, get } = installNodeFetch(() => createResponse({ statusCode: 404 }))
    ;(globalThis as any).__reqnode = (id: string) => id === 'https'
      ? { get }
      : { createWriteStream: () => stream, unlink: vi.fn() }

    await expect(net.downloadThenUnzipToTemp('https://example.com/p.zip'))
      .rejects.toThrow('Request Failed. Status Code: 404')
  })

  test('rejects when the request emits an error', async () => {
    ;(globalThis as any).File = { isNode: true }
    registerService('settings', (() => ({
      get: () => net.Downloader.Nodejs,
    })) as any)

    const stream = createFileStream()
    const get = vi.fn(() => {
      const request = new EventEmitter()
      queueMicrotask(() => request.emit('error', new Error('ECONNRESET')))
      return request
    })
    ;(globalThis as any).__reqnode = (id: string) => id === 'https'
      ? { get }
      : { createWriteStream: () => stream, unlink: vi.fn() }

    await expect(net.downloadThenUnzipToTemp('https://example.com/p.zip'))
      .rejects.toThrow('ECONNRESET')

    expect(notice).toHaveBeenCalledWith('ECONNRESET', 0)
  })
})


function createFileStream() {
  const stream: any = new EventEmitter()
  stream.close = vi.fn((callback: () => void) => callback())
  return stream
}

function createResponse(options: { statusCode?: number, location?: string }) {
  const response: any = new EventEmitter()
  response.statusCode = options.statusCode ?? 200
  response.headers = options.location ? { location: options.location } : {}
  response.resume = vi.fn()
  response.pipe = vi.fn((file: any) => {
    queueMicrotask(() => file.emit('finish'))
    return file
  })
  return response
}

function installNodeFetch(nextResponse: () => any) {
  const stream = createFileStream()
  const get = vi.fn((_url: string, callback: (response: any) => void) => {
    callback(nextResponse())
    return new EventEmitter()
  })
  return { stream, get }
}
