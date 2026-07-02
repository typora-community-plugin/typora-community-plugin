import 'src/setup-test-env'
import { jest } from '@jest/globals'
import { describe, it, expect } from '@jest/globals'
import { View, Closeable } from './view'

describe('View', () => {
  const defaultContainerEl = document.createElement('div')

  describe('then()', () => {
    test('should call callback with containerEl', () => {
      const view = new View()
      view.containerEl = defaultContainerEl
      const callback = jest.fn()
      view.then(callback)
      expect(callback).toHaveBeenCalledWith(defaultContainerEl)
    })

    test('should return this for chaining', () => {
      const view = new View()
      view.containerEl = defaultContainerEl
      const result = view.then(() => {})
      expect(result).toBe(view)
    })

    test('should support chained calls', () => {
      const view = new View()
      view.containerEl = defaultContainerEl
      const logs: string[] = []
      view.then(el => { logs.push(`first:${el.tagName}`) })
        .then(el => { logs.push(`second:${el.tagName}`) })
      expect(view.containerEl).toBe(defaultContainerEl)
      expect(logs).toEqual(['first:DIV', 'second:DIV'])
    })

    test('should pass correct HTMLElement reference', () => {
      const view = new View()
      const el = document.createElement('span')
      view.containerEl = el
      let receivedEl: HTMLElement | undefined
      view.then(el => { receivedEl = el })
      expect(receivedEl).toBe(el)
    })

    test('should work with containerEl as nullish', () => {
      const view = new View()
      view.containerEl = document.createElement('div')
      let called = false
      view.then(el => {
        called = true
        expect(el instanceof HTMLElement).toBe(true)
      })
      expect(called).toBe(true)
    })
  })
})

describe('Closeable', () => {
  test('should allow objects implementing the Closeable interface', () => {
    const implementation: Closeable = {
      open() { },
      close() { }
    }
    expect(typeof implementation.open).toBe('function')
    expect(typeof implementation.close).toBe('function')
  })

  test('should allow concrete class implementing Closeable', () => {
    class MyView implements Closeable {
      isOpen = false
      open(): void { this.isOpen = true }
      close(): void { this.isOpen = false }
    }
    const view = new MyView()
    expect(view.isOpen).toBe(false)
    view.open()
    expect(view.isOpen).toBe(true)
    view.close()
    expect(view.isOpen).toBe(false)
  })
})
