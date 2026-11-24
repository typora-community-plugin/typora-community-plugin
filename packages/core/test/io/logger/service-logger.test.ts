import 'src/setup-test-env'
import { ServiceLogger, wrapWithLoggingProxy } from 'src/io/logger/service-logger'

function makeLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

function collectEntries() {
  const entries: any[] = []
  ServiceLogger.onLog(entry => entries.push(entry))
  return entries
}

afterEach(() => {
  ServiceLogger._resetListeners()
})


describe('ServiceLogger registry', () => {

  test('notifies every registered listener', () => {
    const first = vi.fn()
    const second = vi.fn()
    ServiceLogger.onLog(first)
    ServiceLogger.onLog(second)

    expect(ServiceLogger._listenerCount).toBe(2)

    ServiceLogger._fire({} as any)

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  test('onLog returns an unsubscribe function', () => {
    const listener = vi.fn()
    const off = ServiceLogger.onLog(listener)

    off()
    expect(ServiceLogger._listenerCount).toBe(0)

    // Calling it twice must be a no-op.
    off()

    ServiceLogger._fire({} as any)
    expect(listener).not.toHaveBeenCalled()
  })

  test('swallows errors thrown by listeners', () => {
    const broken = vi.fn(() => { throw new Error('boom') })
    ServiceLogger.onLog(broken)

    expect(() => ServiceLogger._fire({} as any)).not.toThrow()

    expect(broken).toHaveBeenCalledTimes(1)
  })
})


describe('wrapWithLoggingProxy', () => {

  test('returns the original object when logging is not configured', () => {
    const obj = { run: () => 1 }
    const logger = makeLogger()

    expect(wrapWithLoggingProxy(obj, 'scope', logger as any)).toBe(obj)
    expect(wrapWithLoggingProxy(obj, 'scope', logger as any, {})).toBe(obj)
    expect(wrapWithLoggingProxy(obj, 'scope', logger as any, {
      entry: false,
      exit: false,
      errors: false,
    })).toBe(obj)
  })

  test('passes through non-function members untouched', () => {
    const obj = { value: 42, nested: { a: 1 }, run: () => 'ok' }
    const proxy = wrapWithLoggingProxy(obj, 'scope', makeLogger() as any, { entry: true })

    expect(proxy.value).toBe(42)
    expect(proxy.nested).toBe(obj.nested)
  })

  test('emits enter and exit entries with formatted args', () => {
    const entries = collectEntries()
    const obj = { add: (a: number, b: string) => a + b.length }
    const proxy = wrapWithLoggingProxy(obj, 'math', makeLogger() as any, {
      entry: true,
      exit: true,
      args: true,
    })

    expect(proxy.add(1, 'ab')).toBe(3)

    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({
      scope: 'math',
      method: '▸ add()',
      direction: 'enter',
      displayArgs: ' [1, ab]',
      rawArgs: [],
    })
    expect(entries[1]).toMatchObject({
      scope: 'math',
      method: '▹ add()',
      direction: 'exit',
    })
    expect(typeof entries[0].timestamp).toBe('number')
  })

  test('omits the args string when `args` is off', () => {
    const entries = collectEntries()
    const obj = { run: (a: number) => a }
    const proxy = wrapWithLoggingProxy(obj, 'scope', makeLogger() as any, { entry: true })

    proxy.run(7)

    expect(entries[0].displayArgs).toBeUndefined()
  })

  test('reports elapsed milliseconds when `perf` and `exit` are on', () => {
    const entries = collectEntries()
    const obj = { run: () => { } }
    const proxy = wrapWithLoggingProxy(obj, 'scope', makeLogger() as any, {
      exit: true,
      perf: true,
    })

    proxy.run()

    expect(typeof entries[0].ms).toBe('number')
  })

  test('does not emit an exit entry when only `perf` is on', () => {
    const entries = collectEntries()
    const obj = { run: () => { } }
    const proxy = wrapWithLoggingProxy(obj, 'scope', makeLogger() as any, { perf: true })

    proxy.run()

    expect(entries).toHaveLength(0)
  })

  test('skips private/internal methods by default', () => {
    const entries = collectEntries()
    const obj = {
      _secret: () => 'hidden',
      toString: () => 'text',
      visible: () => 'shown',
    }
    const proxy = wrapWithLoggingProxy(obj, 'scope', makeLogger() as any, { entry: true })

    expect(proxy._secret()).toBe('hidden')
    expect(proxy.toString()).toBe('text')
    expect(entries).toHaveLength(0)

    proxy.visible()
    expect(entries).toHaveLength(1)
  })

  test('honours a custom filter', () => {
    const entries = collectEntries()
    const obj = { skip: () => 0, keep: () => 0 }
    const proxy = wrapWithLoggingProxy(obj, 'scope', makeLogger() as any, {
      entry: true,
      filter: name => name === 'skip',
    })

    proxy.skip()
    proxy.keep()

    expect(entries).toHaveLength(1)
    expect(entries[0].method).toBe('▸ keep()')
  })

  test('passes symbol properties through without wrapping', () => {
    const sym = Symbol('sym')
    const obj = { [sym]: () => 'x' }
    const proxy = wrapWithLoggingProxy(obj, 'scope', makeLogger() as any, { entry: true })

    expect((proxy as any)[sym]()).toBe('x')
  })

  test('logs and rethrows errors with method names rewritten', () => {
    const entries = collectEntries()
    const logger = makeLogger()
    const obj = {
      get_value: (_: number): number => { throw new Error('boom') },
    }
    const proxy = wrapWithLoggingProxy(obj, 'settings', logger as any, {
      entry: true,
      errors: true,
      args: true,
    })

    expect(() => proxy.get_value(42)).toThrow('boom')

    expect(logger.error).toHaveBeenCalledWith(
      '[settings] get value()',
      'args: 42',
      'boom',
    )
    expect(entries.map(e => e.direction)).toEqual(['enter', 'error'])
    expect(entries[1].method).toBe('✗ get_value()')
  })

  test('passes non-Error thrown values to the logger', () => {
    const logger = makeLogger()
    const obj = { run: () => { throw 'plain string' } }
    const proxy = wrapWithLoggingProxy(obj, 'scope', logger as any, { errors: true })

    expect(() => proxy.run()).toThrow()

    expect(logger.error).toHaveBeenCalledWith('[scope] run()', '', 'plain string')
  })

  test('summarises unserialisable arguments', () => {
    const logger = makeLogger()
    const circular: any = {}
    circular.self = circular
    const obj = { run: (_: unknown) => { throw new Error('boom') } }
    const proxy = wrapWithLoggingProxy(obj, 'scope', logger as any, {
      errors: true,
      args: true,
    })

    expect(() => proxy.run(circular)).toThrow('boom')

    expect(logger.error).toHaveBeenCalledWith(
      '[scope] run()',
      'args: [unserializable]',
      'boom',
    )
  })

  test('truncates long argument values', () => {
    const logger = makeLogger()
    const obj = { run: (_: string) => { throw new Error('boom') } }
    const proxy = wrapWithLoggingProxy(obj, 'scope', logger as any, {
      errors: true,
      args: true,
    })

    expect(() => proxy.run('x'.repeat(300))).toThrow('boom')

    const args = logger.error.mock.calls[0][1] as string
    expect(args.length).toBe('args: '.length + 200)
    expect(args.endsWith('x')).toBe(true)
  })
})
