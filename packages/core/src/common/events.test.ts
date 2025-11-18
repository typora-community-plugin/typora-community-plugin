import 'src/setup-test-env'
import { jest } from '@jest/globals'
import { Events } from './events'
import { EventListener, EventDefination, PublicEvents } from './events'

// Define test event types
type TestEvents = {
  'test-event': (arg1: string, arg2: number) => void
  'another-event': () => void
  'data-event': (data: { id: number; name: string }) => void
}

class $Events<T extends EventDefination> extends Events<T> {
  getListener(event: string): EventListener[] {
    return this._listeners[event]
  }
}

describe('Events', () => {
  let events: $Events<TestEvents>

  beforeEach(() => {
    // 使用唯一的作用域来避免测试间相互影响
    events = new $Events<TestEvents>(`test-scope-${Date.now()}-${Math.random()}`)
  })

  describe('constructor', () => {
    test('should initialize with empty listeners', () => {
      expect(events.getEventNames()).toEqual([])
    })

    test('should support scope for shared listeners', () => {
      const sharedScope = 'shared-scope-test'
      const events1 = new $Events<TestEvents>(sharedScope)
      const events2 = new $Events<TestEvents>(sharedScope)

      const listener = jest.fn()
      events1.on('test-event', listener)

      // 验证两个实例共享同一个监听器映射
      expect(events2.getEventNames()).toEqual(['test-event'])
    })

    test('should create separate listeners for different scopes', () => {
      const events1 = new $Events<TestEvents>('scope-1')
      const events2 = new $Events<TestEvents>('scope-2')

      const listener = jest.fn()
      events1.on('test-event', listener)

      expect(events1.getEventNames()).toEqual(['test-event'])
      expect(events2.getEventNames()).toEqual([])
    })
  })

  describe('on()', () => {
    test('should register event listener and return dispose function', () => {
      const listener = jest.fn()
      const dispose = events.on('test-event', listener)

      expect(events.getEventNames()).toEqual(['test-event'])
      expect(typeof dispose).toBe('function')

      // 测试清理函数
      dispose()
      expect(events.getListener('test-event')).toEqual([])
    })

    test('should allow multiple listeners for same event', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      events.on('test-event', listener1)
      events.on('test-event', listener2)

      expect(events.getEventNames()).toEqual(['test-event'])
    })

    test('should pass correct arguments to listeners', () => {
      const listener = jest.fn()
      events.on('test-event', listener)

      // @ts-ignore - 访问受保护的 emit 方法进行测试
      events.emit('test-event', 'hello', 42)

      expect(listener).toHaveBeenCalledWith('hello', 42)
    })
  })

  describe('prependListener()', () => {
    test('should add listener at the beginning of the list', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      events.on('test-event', listener1)
      events.prependListener('test-event', listener2)

      const callOrder: string[] = []
      listener1.mockImplementation(() => callOrder.push('listener1'))
      listener2.mockImplementation(() => callOrder.push('listener2'))

      // @ts-ignore - 访问受保护的 emit 方法进行测试
      events.emit('test-event', 'test', 1)

      expect(callOrder).toEqual(['listener2', 'listener1'])
    })

    test('should return dispose function', () => {
      const listener = jest.fn()
      const dispose = events.prependListener('test-event', listener)

      expect(typeof dispose).toBe('function')

      dispose()
      expect(events.getListener('test-event')).toEqual([])
    })
  })

  describe('once()', () => {
    test('should call listener only once', () => {
      const listener = jest.fn()
      events.once('test-event', listener)

      // @ts-ignore - 访问受保护的 emit 方法进行测试
      events.emit('test-event', 'first', 1)
      // @ts-ignore - 访问受保护的 emit 方法进行测试
      events.emit('test-event', 'second', 2)

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith('first', 1)
    })

    test('should return dispose function', () => {
      const listener = jest.fn()
      const dispose = events.once('test-event', listener)

      expect(typeof dispose).toBe('function')

      dispose()
      expect(events.getListener('test-event')).toEqual([])
    })
  })

  describe('off()', () => {
    test('should remove specific listener', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      events.on('test-event', listener1)
      events.on('test-event', listener2)

      events.off('test-event', listener1)

      // @ts-ignore - 访问受保护的 emit 方法进行测试
      events.emit('test-event', 'test', 1)

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalledWith('test', 1)
    })

    test('should do nothing when removing non-existent listener', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      events.on('test-event', listener1)
      events.off('test-event', listener2) // listener2 从未被添加

      // @ts-ignore - 访问受保护的 emit 方法进行测试
      events.emit('test-event', 'test', 1)

      expect(listener1).toHaveBeenCalledWith('test', 1)
    })

    test('should do nothing when event has no listeners', () => {
      const listener = jest.fn()
      // 使用类型断言来测试边界情况
      events.off('another-event' as any, listener) // 应该不会抛出错误
    })
  })

  describe('emit()', () => {
    test('should call all registered listeners', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      events.on('test-event', listener1)
      events.on('test-event', listener2)

      // @ts-ignore - 访问受保护的 emit 方法进行测试
      events.emit('test-event', 'hello', 42)

      expect(listener1).toHaveBeenCalledWith('hello', 42)
      expect(listener2).toHaveBeenCalledWith('hello', 42)
    })

    test('should handle complex data types', () => {
      const listener = jest.fn()
      const testData = { id: 1, name: 'test' }

      events.on('data-event', listener)

      // @ts-ignore - 访问受保护的 emit 方法进行测试
      events.emit('data-event', testData)

      expect(listener).toHaveBeenCalledWith(testData)
    })

    test('should handle events with no arguments', () => {
      const listener = jest.fn()
      events.on('another-event', listener)

      // @ts-ignore - 访问受保护的 emit 方法进行测试
      events.emit('another-event')

      expect(listener).toHaveBeenCalledWith()
    })

    test('should handle listener exceptions gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      const normalListener = jest.fn()

      events.on('test-event', errorListener)
      events.on('test-event', normalListener)

      // 使用 try-catch 来捕获异常，确保测试不会因为异常而失败
      try {
        // @ts-ignore - 访问受保护的 emit 方法进行测试
        events.emit('test-event', 'test', 1)
      } catch (error) {
        // 忽略异常，我们只关心其他监听器是否被调用
      }

      // 即使有监听器抛出异常，其他监听器仍应被调用
      expect(normalListener).toHaveBeenCalledWith('test', 1)
    })
  })

  describe('getEventNames()', () => {
    test('should return all registered event names', () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      events.on('test-event', listener1)
      events.on('another-event', listener2)

      const eventNames = events.getEventNames()
      expect(eventNames).toContain('test-event')
      expect(eventNames).toContain('another-event')
      expect(eventNames).toHaveLength(2)
    })

    test('should return empty array when no events registered', () => {
      expect(events.getEventNames()).toEqual([])
    })
  })
})

describe('PublicEvents', () => {
  let publicEvents: PublicEvents<TestEvents>

  beforeEach(() => {
    publicEvents = new PublicEvents<TestEvents>(`public-scope-${Date.now()}-${Math.random()}`)
  })

  test('should inherit from Events', () => {
    expect(publicEvents).toBeInstanceOf(Events)
  })

  test('should have public emit method', () => {
    const listener = jest.fn()
    publicEvents.on('test-event', listener)

    // 可以直接调用 public emit 方法
    publicEvents.emit('test-event', 'hello', 42)

    expect(listener).toHaveBeenCalledWith('hello', 42)
  })

  test('should support all Events methods', () => {
    const listener = jest.fn()
    publicEvents.on('test-event', listener)
    publicEvents.emit('test-event', 'test', 1)

    expect(listener).toHaveBeenCalledWith('test', 1)
    expect(publicEvents.getEventNames()).toEqual(['test-event'])
  })
})
