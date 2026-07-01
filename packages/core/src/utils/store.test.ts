import { Store } from "./store"
import { jest } from '@jest/globals'

describe('Store', () => {

  describe('constructor', () => {

    it('should initialize with empty data when no data provided', () => {
      const store = new Store<{ name: string }>()
      expect(store.get('name')).toBeUndefined()
    })

    it('should initialize with provided data using Object.create', () => {
      const data = { name: 'test', count: 42 }
      const store = new Store<typeof data>(data)
      expect(store.get('name')).toBe('test')
      expect(store.get('count')).toBe(42)
    })

    it('should not mutate the original data object', () => {
      const original = { name: 'original' }
      const store = new Store<typeof original>(original)
      store.set('name', 'modified')
      expect(original.name).toBe('original')
    })

  })

  describe('get', () => {

    it('should get value by string key', () => {
      const store = new Store<{ name: string }>({ name: 'hello' })
      expect(store.get('name')).toBe('hello')
    })

    it('should get value by string array path', () => {
      const store = newStore({ user: { name: 'john' } })
      expect(store.get(['user', 'name'])).toBe('john')
    })

    it('should get value by nested string array path', () => {
      const store = newStore({ a: { b: { c: 'deep' } } })
      expect(store.get(['a', 'b', 'c'])).toBe('deep')
    })

    it('should return undefined for non-existent path', () => {
      const store = newStore({ name: 'test' })
      expect(store.get('nonexistent')).toBeUndefined()
      expect(store.get(['a', 'b'])).toBeUndefined()
    })

    it('should return undefined when intermediate path is not an object', () => {
      const store = newStore({ name: 'test' })
      expect(store.get(['name', 'foo'])).toBeUndefined()
    })

    it('should return undefined when intermediate path is null', () => {
      // @ts-ignore
      const store = newStore<{ a: null }>({ a: null })
      expect(store.get(['a', 'b'])).toBeUndefined()
    })

    it('should throw TypeError for invalid key type', () => {
      const store = newStore({ name: 'test' })
      // @ts-ignore
      expect(() => store.get(123)).toThrow(TypeError)
      // @ts-ignore
      expect(() => store.get(null)).toThrow(TypeError)
    })

  })

  describe('set', () => {

    it('should set value by string key', () => {
      const store = newStore<{ name: string }>({ name: 'old' })
      store.set('name', 'new')
      expect(store.get('name')).toBe('new')
    })

    it('should set value by string array path', () => {
      const store = newStore<{ user: { name: string } }>({ user: { name: 'old' } })
      store.set(['user', 'name'], 'new')
      expect(store.get(['user', 'name'])).toBe('new')
    })

    it('should create intermediate objects for nested path', () => {
      const store = newStore<{ a?: { b?: { c: string } } }>({})
      store.set(['a', 'b', 'c'], 'created')
      expect(store.get(['a', 'b', 'c'])).toBe('created')
    })

    it('should overwrite existing primitive values in path', () => {
      const store = newStore<{ name: string }>({ name: 'old' })
      store.set(['name', 'nested'], 'should create')
      expect(store.get(['name', 'nested'])).toBe('should create')
    })

    it('should not trigger emit when value is the same (strict equality)', () => {
      const store = newStore<{ count: number }>({ count: 10 })
      const listener = jest.fn()
      store.addChangeListener('count', listener)
      store.set('count', 10)
      expect(listener).not.toHaveBeenCalled()
    })

    it('should not trigger emit when value is the same object reference', () => {
      const obj = { a: 1 }
      const store = newStore<{ data: object }>({ data: obj })
      const listener = jest.fn()
      store.addChangeListener('data', listener)
      store.set('data', obj)
      expect(listener).not.toHaveBeenCalled()
    })

    it('should trigger emit when value is different object with same content', () => {
      const store = newStore<{ data: { a: number } }>({ data: { a: 1 } })
      const listener = jest.fn()
      store.addChangeListener('data', listener)
      store.set('data', { a: 1 })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should throw TypeError for invalid key type', () => {
      const store = newStore({ name: 'test' })
      // @ts-ignore
      expect(() => store.set(123, 'value')).toThrow(TypeError)
      // @ts-ignore
      expect(() => store.set(null, 'value')).toThrow(TypeError)
    })

  })

  describe('addChangeListener', () => {

    it('should call listener when specific key changes', () => {
      const store = newStore<{ name: string }>({ name: 'initial' })
      const listener = jest.fn()
      store.addChangeListener('name', listener)
      store.set('name', 'updated')
      expect(listener).toHaveBeenCalledWith('name', 'updated')
    })

    it('should call listener when nested key path changes', () => {
      const store = newStore<{ user: { name: string } }>({ user: { name: 'initial' } })
      const listener = jest.fn()
      store.addChangeListener(['user', 'name'], listener)
      store.set(['user', 'name'], 'updated')
      expect(listener).toHaveBeenCalledWith(['user', 'name'], 'updated')
    })

    it('should call wildcard listener for any key change', () => {
      const store = newStore<{ a: number; b: string }>({ a: 1, b: 'x' })
      const listener = jest.fn()
      store.addChangeListener('*', listener)
      store.set('a', 2)
      expect(listener).toHaveBeenCalledWith('a', 2)
      store.set('b', 'y')
      expect(listener).toHaveBeenCalledWith('b', 'y')
    })

    it('should not call listener for other keys', () => {
      const store = newStore<{ a: number; b: string }>({ a: 1, b: 'x' })
      const listener = jest.fn()
      store.addChangeListener('a', listener)
      store.set('b', 'y')
      expect(listener).not.toHaveBeenCalled()
    })

    it('should return dispose function that removes listener', () => {
      const store = newStore<{ name: string }>({ name: 'initial' })
      const listener = jest.fn()
      const dispose = store.addChangeListener('name', listener)
      dispose()
      store.set('name', 'updated')
      expect(listener).not.toHaveBeenCalled()
    })

    it('should not add duplicate listener', () => {
      const store = newStore<{ name: string }>({ name: 'initial' })
      const listener = jest.fn()
      store.addChangeListener('name', listener)
      const dispose = store.addChangeListener('name', listener)
      store.set('name', 'updated')
      expect(listener).toHaveBeenCalledTimes(1)
      dispose()
    })

    it('should handle listener errors gracefully', () => {
      const store = newStore<{ name: string }>({ name: 'initial' })
      const errorListener = jest.fn(() => { throw new Error('listener error') })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      store.addChangeListener('name', errorListener)
      expect(() => store.set('name', 'updated')).not.toThrow()
      expect(errorListener).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

  })

  describe('onChange (alias)', () => {

    it('should be same as addChangeListener', () => {
      const store = newStore<{ name: string }>({ name: 'initial' })
      const listener = jest.fn()
      store.onChange('name', listener)
      store.set('name', 'updated')
      expect(listener).toHaveBeenCalled()
    })

  })

  describe('removeChangeListener', () => {

    it('should remove listener by key', () => {
      const store = newStore<{ name: string }>({ name: 'initial' })
      const listener = jest.fn()
      store.addChangeListener('name', listener)
      store.removeChangeListener('name', listener)
      store.set('name', 'updated')
      expect(listener).not.toHaveBeenCalled()
    })

    it('should remove listener by array path', () => {
      const store = newStore<{ user: { name: string } }>({ user: { name: 'initial' } })
      const listener = jest.fn()
      store.addChangeListener(['user', 'name'], listener)
      store.removeChangeListener(['user', 'name'], listener)
      store.set(['user', 'name'], 'updated')
      expect(listener).not.toHaveBeenCalled()
    })

    it('should not call other listeners after removing one', () => {
      const store = newStore<{ name: string }>({ name: 'initial' })
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      store.addChangeListener('name', listener1)
      store.addChangeListener('name', listener2)
      store.removeChangeListener('name', listener1)
      store.set('name', 'updated')
      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).toHaveBeenCalledTimes(1)
    })

    it('should handle removing from empty listeners gracefully', () => {
      const store = newStore<{ name: string }>({ name: 'initial' })
      const listener = jest.fn()
      expect(() => store.removeChangeListener('name', listener)).not.toThrow()
    })

    it('should remove wildcard listener', () => {
      const store = newStore<{ name: string }>({ name: 'initial' })
      const listener = jest.fn()
      store.addChangeListener('*', listener)
      store.removeChangeListener('*', listener)
      store.set('name', 'updated')
      expect(listener).not.toHaveBeenCalled()
    })

  })

  describe('edge cases', () => {

    it('should handle setting array values', () => {
      const store = newStore<{ items: string[] }>({ items: ['a'] })
      store.set('items', ['a', 'b', 'c'])
      expect(store.get('items')).toEqual(['a', 'b', 'c'])
    })

    it('should handle setting null values', () => {
      const store = newStore<{ name: string | null }>({ name: 'test' })
      store.set('name', null)
      expect(store.get('name')).toBeNull()
    })

    it('should handle setting undefined values', () => {
      const store = newStore<{ name?: string }>({ name: 'test' })
      store.set('name', undefined)
      expect(store.get('name')).toBeUndefined()
    })

    it('should handle numeric string keys', () => {
      const store = newStore<{ 0: string }>({ '0': 'zero' })
      expect(store.get('0')).toBe('zero')
    })

  })

})


function newStore<T extends Record<string, any>>(data: T): Store<T> {
  return new Store(data)
}
