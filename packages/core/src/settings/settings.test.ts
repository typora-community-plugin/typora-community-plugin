import { jest } from '@jest/globals'
import type { ConfigStorage } from "src/io/config-storage"
import { Settings } from "./settings"


describe('class Settings', () => {

  const vault = new class implements ConfigStorage {
    readConfigJson(filename: string, defaultValue?: any) {
      return defaultValue
    }
    writeConfigJson(filename: string, config: any): Promise<void> {
      return Promise.resolve()
    }
  }

  let settings: Settings<any>
  beforeEach(() => {
    settings = new Settings<any>({
      filename: 'test',
      version: 1,
    }, vault)
  })

  describe('get()', () => {

    beforeEach(() => {
      settings.set('key1', 'value1')
      settings.set('key2', 1)
    })

    it('should return the value for a given key', () => {
      const value = settings.get('key1')
      expect(value).toBe('value1')
    })

    it('should return undefined for a non-existing key', () => {
      const value = settings.get('nonExistingKey')
      expect(value).toBeUndefined()
    })

    it('should throw a type error for a key of incorrect type', () => {
      expect(() => settings.get(42 as any)).toThrow(TypeError)
    })

    it('should use the correct type for the returned value', () => {
      const value1 = settings.get('key1')
      expect(typeof value1).toBe('string')
      const value2 = settings.get('key2')
      expect(typeof value2).toBe('number')
    })
  })

  describe('setDefault()', () => {

    it('should set default settings when _stores.settings is empty', () => {
      const defaultSettings = {
        key1: 'value1',
        key2: 'value2',
      }

      settings.setDefault(defaultSettings)

      // @ts-ignore
      expect(settings._stores.settings).toEqual(defaultSettings)
    })

    it('should merge default settings with existing _stores.settings', () => {
      // @ts-ignore
      settings._stores.settings = {
        existingKey: 'existingValue'
      }
      settings.set('existingKey', 'existingValue')

      const defaultSettings = {
        key1: 'value1',
        key2: 'value2',
      }

      settings.setDefault(defaultSettings)

      // @ts-ignore
      expect(settings._stores.settings).toEqual({
        existingKey: 'existingValue',
        key1: 'value1',
        key2: 'value2',
      })
    })

    it('should not override existing settings with default settings', () => {
      // @ts-ignore
      settings._stores.settings = {
        overlappingKey: 'oldValue',
        existingKey: 'existingValue',
      }

      const defaultSettings = {
        overlappingKey: 'newValue',
        key1: 'value1',
      }

      settings.setDefault(defaultSettings)

      // @ts-ignore
      expect(settings._stores.settings).toEqual({
        overlappingKey: 'oldValue', // this value should not be overriden
        existingKey: 'existingValue',
        key1: 'value1',
      })
    })
  })

  describe('set()', () => {

    it('should set the value in _stores.settings', () => {
      const testKey = 'testKey'
      const testValue = 'testValue'

      settings.set(testKey, testValue)

      expect(settings.get(testKey)).toBe(testValue)
    });

    it('should notify listeners when a value is set', () => {
      const testKey = 'testKey'
      const testValue = 'testValue'

      const mockListener = jest.fn()
      // @ts-ignore
      settings._listeners[testKey] = [mockListener]

      settings.set(testKey, testValue)

      expect(mockListener).toHaveBeenCalledWith(testKey, testValue)
      expect(mockListener).toHaveBeenCalledTimes(1)
    })

    it('should call save method when a value is set', () => {
      const saveSpy = jest.spyOn(settings, 'save')

      settings.set('someKey', 'someValue')

      expect(saveSpy).toHaveBeenCalledTimes(1)

      saveSpy.mockReset()
      saveSpy.mockRestore()
    });

    it('should not call listeners or save if the value is the same', () => {
      const testKey = 'testKey'
      const testValue = 'testValue'

      settings.set(testKey, testValue)

      const mockListener = jest.fn()
      // @ts-ignore
      settings._listeners[testKey] = [mockListener]

      const saveSpy = jest.spyOn(settings, 'save')

      settings.set(testKey, testValue)
      expect(mockListener).not.toHaveBeenCalled()
      expect(saveSpy).toHaveBeenCalledTimes(0)

      saveSpy.mockReset()
      saveSpy.mockRestore()
    })
  })

  describe('addChangeListener()', () => {

    it('should add a listener to the _listeners object', () => {
      const key = 'testKey'
      const listener = jest.fn()

      settings.addChangeListener(key, listener)

      // @ts-ignore
      expect(settings._listeners[key]).toHaveLength(1)
      // @ts-ignore
      expect(settings._listeners[key]).toContain(listener)
    })

    it('should remove the listener when the returned function is called', () => {
      const key = 'testKey'
      const listener = jest.fn()

      const dispose = settings.addChangeListener(key, listener)
      dispose()

      // @ts-ignore
      expect(settings._listeners[key]).toHaveLength(0)
    })

    it('should not add the same listener multiple times', () => {
      const key = 'testKey'
      const listener = jest.fn()

      settings.addChangeListener(key, listener)
      settings.addChangeListener(key, listener)

      // @ts-ignore
      expect(settings._listeners[key]).toHaveLength(1)
      // @ts-ignore
      expect(settings._listeners[key]).toContain(listener)
    })
  })

  describe('removeChangeListener()', () => {

    test('removeChangeListener removes a listener for a given key', () => {
      const key = 'testKey'
      const listener1 = jest.fn()
      const listener2 = jest.fn()

      settings.addChangeListener(key, listener1)
      settings.addChangeListener(key, listener2)

      settings.removeChangeListener(key, listener1)

      // @ts-ignore
      const remainingListeners = settings._listeners[key]
      expect(remainingListeners).toHaveLength(1)
      expect(remainingListeners).toContain(listener2)
      expect(remainingListeners).not.toContain(listener1)
    });

    test('removeChangeListener does nothing when listener is not present', () => {
      const key = 'testKey';
      const listener1 = jest.fn();
      const listener3 = jest.fn(); // 注意: 这不是之前添加的监听器

      settings.addChangeListener(key, listener1)

      settings.removeChangeListener(key, listener3)

      // @ts-ignore
      const remainingListeners = settings._listeners[key]
      expect(remainingListeners).toHaveLength(1)
      expect(remainingListeners).toContain(listener1)
    });

    test('removeChangeListener does nothing when key is not present', () => {
      const key = 'testKey'
      const listener1 = jest.fn()

      settings.removeChangeListener(key, listener1)

      // @ts-ignore
      expect(settings._listeners[key]).toBeUndefined()
    })
  })
})
