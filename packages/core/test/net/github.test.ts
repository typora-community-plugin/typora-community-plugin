import 'src/setup-test-env'
import { registerService } from 'src/common/service'
import { GithubAPI } from 'src/net/github'
import * as net from 'src/net/net'
import { Notice } from 'src/ui/components/notice'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('src/net/net', () => ({
  downloadThenUnzipToTemp: vi.fn(),
}))


type Handler = (previous: any, value: any) => void

const handlers: Record<string, Handler> = {}

const settings = {
  get: vi.fn((key: string) => key === 'githubProxy' ? 'github' : undefined),
  set: vi.fn(),
  onChange: vi.fn((key: string, handler: Handler) => {
    handlers[key] = handler
    return () => { }
  }),
}

const fetchMock = vi.fn()

function response(options: {
  ok?: boolean
  status?: number
  statusText?: string
  json?: () => any
  text?: () => string
} = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    json: options.json ?? (async () => ({})),
    text: options.text ?? (() => ''),
  }
}

let api: GithubAPI

beforeEach(() => {
  Object.keys(handlers).forEach(key => delete handlers[key])
  settings.get.mockClear()
  settings.set.mockClear()
  settings.onChange.mockClear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.mocked(net.downloadThenUnzipToTemp).mockClear()

  registerService('settings', (() => settings) as any)
  registerService('i18n', (() => ({
    t: { githubAPI: { proxyNotFound: 'proxy not found' } },
  })) as any)

  api = new GithubAPI()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})


describe('GithubAPI URLs', () => {

  test('builds a raw file URL from the active proxy', async () => {
    fetchMock.mockResolvedValue(response())

    await api.getFile('owner/repo', 'main', 'plugins.json')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/owner/repo/main/plugins.json',
    )
  })

  test('switches the raw URL when the proxy setting changes', async () => {
    fetchMock.mockResolvedValue(response())

    // settings.onChange listeners receive (previousValue, nextValue)
    handlers.githubProxy(undefined, 'gh-proxy.com')
    await api.getFile('owner/repo', 'main', 'a.json')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://gh-proxy.com/https://raw.githubusercontent.com/owner/repo/main/a.json',
    )
  })

  test('falls back to GitHub and persists the setting for an unknown proxy', () => {
    vi.useFakeTimers()
    const error = vi.spyOn(Notice, 'error').mockImplementation(() => ({}) as any)

    handlers.githubProxy(undefined, 'unknown-proxy')

    expect(settings.set).toHaveBeenCalledWith('githubProxy', 'github')
    expect(api.rawUrl).toBe('https://raw.githubusercontent.com/')

    vi.advanceTimersByTime(5_000)

    expect(error).toHaveBeenCalledWith('proxy not found')
  })

  test('builds release download URLs', () => {
    expect(api.getReleaseUrl('owner/repo', 'v1.0.0', 'plugin.zip'))
      .toBe('https://github.com/owner/repo/releases/download/v1.0.0/plugin.zip')
  })
})


describe('GithubAPI requests', () => {

  test('getJSON parses the response body', async () => {
    fetchMock.mockResolvedValue(response({ json: async () => ({ id: 'x' }) }))

    await expect(api.getJSON('owner/repo', 'main', 'a.json')).resolves.toEqual({ id: 'x' })
  })

  test('getFileText returns the body of an ok response', async () => {
    fetchMock.mockResolvedValue(response({ text: () => 'content' }))

    await expect(api.getFileText('owner/repo', 'main', 'a.md')).resolves.toBe('content')
  })

  test('getFileText returns undefined for a missing file', async () => {
    fetchMock.mockResolvedValue(response({ ok: false, status: 404 }))

    await expect(api.getFileText('owner/repo', 'main', 'a.md')).resolves.toBeUndefined()
  })

  test('getFileText swallows network errors', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))

    await expect(api.getFileText('owner/repo', 'main', 'a.md')).resolves.toBeUndefined()
  })

  test('getDefaultBranch reads default_branch from the API', async () => {
    fetchMock.mockResolvedValue(response({ json: async () => ({ default_branch: 'trunk' }) }))

    await expect(api.getDefaultBranch('owner/repo')).resolves.toBe('trunk')

    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo')
  })

  test('getReleaseInfo returns the latest release', async () => {
    fetchMock.mockResolvedValue(response({
      json: async () => ({ tag_name: 'v1.2.3', assets: [] }),
    }))

    await expect(api.getReleaseInfo('owner/repo')).resolves.toMatchObject({ tag_name: 'v1.2.3' })

    expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo/releases/latest')
  })

  test('getReleaseInfo rejects a failed request', async () => {
    fetchMock.mockResolvedValue(response({ ok: false, status: 500, statusText: 'Server Error' }))

    await expect(api.getReleaseInfo('owner/repo'))
      .rejects.toThrow('Failed to get release info of "owner/repo": 500 Server Error')
  })

  test('getReleaseInfo rejects a payload without tag_name', async () => {
    fetchMock.mockResolvedValue(response({ json: async () => ({}) }))

    await expect(api.getReleaseInfo('owner/repo'))
      .rejects.toThrow('Invalid release info of "owner/repo": missing "tag_name"')
  })

  test('downloadThenUnzipToTemp delegates to the net module', async () => {
    await api.downloadThenUnzipToTemp('owner/repo', 'v1.0.0', 'plugin.zip')

    expect(net.downloadThenUnzipToTemp).toHaveBeenCalledWith(
      'https://github.com/owner/repo/releases/download/v1.0.0/plugin.zip',
    )
  })
})
