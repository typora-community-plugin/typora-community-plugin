import 'src/setup-test-env'
import { jest } from '@jest/globals'
import { Component, Loadable } from './component'

// 测试用的子组件类
class TestComponent extends Component {
  onloadCalled = false
  onunloadCalled = false
  loadCallCount = 0
  unloadCallCount = 0

  onload() {
    this.onloadCalled = true
    this.loadCallCount++
  }

  onunload() {
    this.onunloadCalled = true
    this.unloadCallCount++
  }
}

// 用于访问受保护成员的测试子类
class $Component extends Component {
  get loaded() { return this._loaded }
  get children() { return this._children }
  get disposables() { return this._disposables }
}

describe('Component', () => {
  let component: $Component
  let testComponent: TestComponent

  beforeEach(() => {
    component = new $Component()
    testComponent = new TestComponent()
  })

  describe('constructor', () => {
    test('should initialize with correct default values', () => {
      expect(component.loaded).toBe(false)
      expect(component.children).toEqual([])
      expect(component.disposables).toEqual([])
    })
  })

  describe('load()', () => {
    test('should call onload and set loaded to true on first call', () => {
      const onloadSpy = jest.spyOn(component, 'onload')

      component.load()

      expect(onloadSpy).toHaveBeenCalledTimes(1)
      expect(component.loaded).toBe(true)

      onloadSpy.mockRestore()
    })

    test('should not call onload again if already loaded', () => {
      component.load() // First load
      const onloadSpy = jest.spyOn(component, 'onload')

      component.load() // Second load

      expect(onloadSpy).not.toHaveBeenCalled()

      onloadSpy.mockRestore()
    })

    test('should load all children when loaded', () => {
      const child1 = new TestComponent()
      const child2 = new TestComponent()

      component.addChild(child1)
      component.addChild(child2)

      component.load()

      expect(child1.onloadCalled).toBe(true)
      expect(child2.onloadCalled).toBe(true)
    })
  })

  describe('unload()', () => {
    test('should call onunload and set loaded to false', () => {
      component.load() // First load it
      const onunloadSpy = jest.spyOn(component, 'onunload')

      component.unload()

      expect(onunloadSpy).toHaveBeenCalledTimes(1)
      expect(component.loaded).toBe(false)

      onunloadSpy.mockRestore()
    })

    test('should not call onunload if not loaded', () => {
      const onunloadSpy = jest.spyOn(component, 'onunload')

      component.unload() // Unload without loading first

      expect(onunloadSpy).not.toHaveBeenCalled()

      onunloadSpy.mockRestore()
    })

    test('should unload all children when unloaded', () => {
      const child1 = new TestComponent()
      const child2 = new TestComponent()

      component.addChild(child1)
      component.addChild(child2)
      component.load() // Load everything

      component.unload()

      expect(child1.onunloadCalled).toBe(true)
      expect(child2.onunloadCalled).toBe(true)
    })

    test('should clear all disposables when unloaded', () => {
      const disposable1 = jest.fn()
      const disposable2 = jest.fn()

      component.register(disposable1)
      component.register(disposable2)
      component.load()

      component.unload()

      expect(disposable1).toHaveBeenCalledTimes(1)
      expect(disposable2).toHaveBeenCalledTimes(1)
      expect(component.disposables).toEqual([])
    })

    test('should clear all children when unloaded', () => {
      const child1 = new TestComponent()
      const child2 = new TestComponent()

      component.addChild(child1)
      component.addChild(child2)
      component.load()

      component.unload()

      expect(component.children).toEqual([])
    })
  })

  describe('addChild()', () => {
    test('should add child to children array', () => {
      component.addChild(testComponent)

      expect(component.children).toContain(testComponent)
      expect(component.children).toHaveLength(1)
    })

    test('should load child immediately if parent is loaded', () => {
      component.load() // Load parent first

      component.addChild(testComponent)

      expect(testComponent.onloadCalled).toBe(true)
    })

    test('should not load child if parent is not loaded', () => {
      component.addChild(testComponent) // Parent not loaded

      expect(testComponent.onloadCalled).toBe(false)
    })

    test('should return dispose function', () => {
      const dispose = component.addChild(testComponent)

      expect(typeof dispose).toBe('function')

      dispose() // Call the dispose function
      expect(component.children).not.toContain(testComponent)
    })
  })

  describe('removeChild()', () => {
    test('should remove child from children array', () => {
      component.addChild(testComponent)

      component.removeChild(testComponent)

      expect(component.children).not.toContain(testComponent)
    })

    test('should unload child when removed', () => {
      component.addChild(testComponent)
      component.load() // Load everything

      component.removeChild(testComponent)

      expect(testComponent.onunloadCalled).toBe(true)
    })

    test('should handle removing non-existent child gracefully', () => {
      const nonExistentChild = new TestComponent()

      expect(() => {
        component.removeChild(nonExistentChild)
      }).not.toThrow()

      expect(component.children).toEqual([])
    })
  })

  describe('register() and unregister()', () => {
    test('register should add disposable to disposables array', () => {
      const disposable = jest.fn()

      component.register(disposable)

      expect(component.disposables).toContain(disposable)
      expect(component.disposables).toHaveLength(1)
    })

    test('unregister should call disposable and remove it from array', () => {
      const disposable = jest.fn()

      component.register(disposable)
      component.unregister(disposable)

      expect(disposable).toHaveBeenCalledTimes(1)
      expect(component.disposables).not.toContain(disposable)
    })

    test('unregister should handle non-existent disposable gracefully', () => {
      const nonExistentDisposable = jest.fn()

      expect(() => {
        component.unregister(nonExistentDisposable)
      }).not.toThrow()

      expect(component.disposables).toEqual([])
    })

    test('unregister should handle null/undefined disposable', () => {
      expect(() => {
        component.unregister(undefined as any)
      }).not.toThrow()

      expect(() => {
        component.unregister(null as any)
      }).not.toThrow()
    })
  })

  describe('registerDomEvent()', () => {
    test('should register event listener and add cleanup to disposables', () => {
      const target = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      } as any

      const listener = jest.fn()

      component.registerDomEvent(target, 'click', listener)

      expect(target.addEventListener).toHaveBeenCalledWith('click', listener, undefined)
      expect(component.disposables).toHaveLength(1)
    })

    test('should pass options to addEventListener', () => {
      const target = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      } as any

      const listener = jest.fn()
      const options = { capture: true }

      component.registerDomEvent(target, 'click', listener, options)

      expect(target.addEventListener).toHaveBeenCalledWith('click', listener, options)
    })

    test('should remove event listener when disposed', () => {
      const target = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      } as any

      const listener = jest.fn()

      component.registerDomEvent(target, 'click', listener)

      // Get the disposable and call it
      const disposable = component.disposables[0]
      disposable()

      expect(target.removeEventListener).toHaveBeenCalledWith('click', listener, undefined)
    })
  })

  describe('registerInterval()', () => {
    test('should register interval cleanup function', () => {
      const intervalId = 123 as any
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      component.registerInterval(intervalId)

      expect(component.disposables).toHaveLength(1)

      // Call the cleanup function
      const disposable = component.disposables[0]
      disposable()

      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId)

      clearIntervalSpy.mockRestore()
    })
  })

  describe('onload() and onunload()', () => {
    test('onload should be callable and do nothing by default', () => {
      const baseComponent = new Component()

      expect(() => {
        baseComponent.onload()
      }).not.toThrow()
    })

    test('onunload should be callable and do nothing by default', () => {
      const baseComponent = new Component()

      expect(() => {
        baseComponent.onunload()
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    test('should handle multiple add/remove of same child', () => {
      component.addChild(testComponent)
      component.addChild(testComponent) // Add same child again

      expect(component.children).toHaveLength(2)
      expect(component.children[0]).toBe(testComponent)
      expect(component.children[1]).toBe(testComponent)

      component.removeChild(testComponent) // Remove all occurrences

      expect(component.children).toHaveLength(0)
    })

    test('should handle multiple register/unregister of same disposable', () => {
      const disposable = jest.fn()

      component.register(disposable)
      component.register(disposable) // Register same disposable again

      expect(component.disposables).toHaveLength(2)

      component.unregister(disposable) // Unregister all occurrences

      expect(component.disposables).toHaveLength(0)
      expect(disposable).toHaveBeenCalledTimes(1) // Should only call once even with multiple instances
    })

    test('should not load child multiple times when added multiple times', () => {
      component.load() // Load parent first

      component.addChild(testComponent)
      component.addChild(testComponent) // Add same child again

      expect(testComponent.loadCallCount).toBe(1) // Should only load once
    })
  })
})
