import { jest } from '@jest/globals'
import 'src/setup-test-env'
import { Settings, SettingMigrations } from "./settings"
import { useService } from "src/common/service"


describe('class Settings', () => {

  let settings: Settings<any>
  beforeEach(() => {
    settings = new Settings<any>({
      filename: 'test',
      version: 1,
    })
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
      expect(settings._stores.settings).toEqual({})
      // @ts-ignore
      expect(Object.getPrototypeOf(settings._stores.settings)).toEqual(defaultSettings)
    })

    it('should merge default settings with existing _stores.settings', () => {
      settings.set('existingKey', 'existingValue')

      const defaultSettings = {
        key1: 'value1',
        key2: 'value2',
      }

      settings.setDefault(defaultSettings)

      expect(settings.get('existingKey')).toBe('existingValue')
      expect(settings.get('key1')).toBe('value1')
      expect(settings.get('key2')).toBe('value2')
    })

    it('should not override existing settings with default settings', () => {
      settings.set('overlappingKey', 'oldValue')
      settings.set('existingKey', 'existingValue')

      const defaultSettings = {
        overlappingKey: 'newValue',
        key1: 'value1',
      }

      settings.setDefault(defaultSettings)

      expect(settings.get('overlappingKey')).toBe('oldValue')
      expect(settings.get('existingKey')).toBe('existingValue')
      expect(settings.get('key1')).toBe('value1')
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

  describe('migrations', () => {

    let configRepo: any
    beforeEach(() => {
      jest.useFakeTimers()
      configRepo = useService('config-repository')
      configRepo.readConfigJson.mockReset()
      configRepo.readConfigJson.mockImplementation((filename: string, defaultValue: any) => defaultValue)
      configRepo.writeConfigJson.mockReset()
      configRepo.setConfigDir(`/unique-config-dir-${Date.now()}-${Math.random()}`)
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should not migrate when file version equals code version', () => {
      configRepo.readConfigJson.mockReturnValue({
        version: 1,
        settings: { theme: 'dark' },
      })

      const migrations = new SettingMigrations()
      migrations.addMigration(1, 2, (oldStores) => ({
        ...oldStores,
        settings: { ...oldStores.settings, themeMode: oldStores.settings.theme },
      }))

      const s = new Settings<any>({
        filename: 'migration-test',
        version: 1,
        migrations,
      })

      jest.runAllTimers()

      expect(s.get('theme')).toBe('dark')
      expect(configRepo.writeConfigJson).not.toHaveBeenCalled()
      expect(migrations.hasMigrated).toBe(false)
    })

    it('should migrate when file version is less than code version', () => {
      configRepo.readConfigJson.mockReturnValue({
        version: 1,
        settings: { theme: 'dark', fontSize: 14 },
      })

      const migrations = new SettingMigrations()
      migrations.addMigration(1, 2, (oldStores) => ({
        version: 2,
        settings: {
          ...oldStores.settings,
          appearance: {
            theme: oldStores.settings.theme,
            fontSize: oldStores.settings.fontSize,
          },
        },
      }))

      const s = new Settings<any>({
        filename: 'migration-test',
        version: 2,
        migrations,
      })

      jest.runAllTimers()

      expect(migrations.hasMigrated).toBe(false)
      expect(configRepo.writeConfigJson).toHaveBeenCalledTimes(1)
      expect(s.get('appearance')).toEqual({
        theme: 'dark',
        fontSize: 14,
      })
    })

    it('should perform chained migrations across multiple versions', () => {
      configRepo.readConfigJson.mockReturnValue({
        version: 1,
        settings: { theme: 'dark', fontSize: 14 },
      })

      const migrations = new SettingMigrations()
      migrations
        .addMigration(1, 2, (oldStores) => ({
          version: 2,
          settings: {
            ...oldStores.settings,
            appearance: {
              theme: oldStores.settings.theme,
              fontSize: oldStores.settings.fontSize,
            },
          },
        }))
        .addMigration(2, 3, (oldStores) => ({
          version: 3,
          settings: {
            ...oldStores.settings,
            appearance: {
              ...oldStores.settings.appearance,
              lineHeight: 1.6,
            },
          },
        }))

      const s = new Settings<any>({
        filename: 'migration-test',
        version: 3,
        migrations,
      })

      jest.runAllTimers()

      expect(migrations.hasMigrated).toBe(false)
      expect(configRepo.writeConfigJson).toHaveBeenCalledTimes(1)
      expect(s.get('appearance')).toEqual({
        theme: 'dark',
        fontSize: 14,
        lineHeight: 1.6,
      })
    })

    it('should migrate only from intermediate version when file is partially migrated', () => {
      configRepo.readConfigJson.mockReturnValue({
        version: 2,
        settings: {
          appearance: { theme: 'light', fontSize: 16 },
        },
      })

      const migrations = new SettingMigrations()
      migrations
        .addMigration(1, 2, (oldStores) => ({
          version: 2,
          settings: {
            ...oldStores.settings,
            appearance: {
              theme: oldStores.settings.theme,
              fontSize: oldStores.settings.fontSize,
            },
          },
        }))
        .addMigration(2, 3, (oldStores) => ({
          version: 3,
          settings: {
            ...oldStores.settings,
            appearance: {
              ...oldStores.settings.appearance,
              lineHeight: 1.6,
            },
          },
        }))

      const s = new Settings<any>({
        filename: 'migration-test',
        version: 3,
        migrations,
      })

      jest.runAllTimers()

      expect(configRepo.writeConfigJson).toHaveBeenCalledTimes(1)
      expect(s.get('appearance')).toEqual({
        theme: 'light',
        fontSize: 16,
        lineHeight: 1.6,
      })
    })

    it('should not call save when no migrations are needed', () => {
      configRepo.readConfigJson.mockReturnValue({
        version: 2,
        settings: { appearance: { theme: 'dark' } },
      })

      const migrations = new SettingMigrations()
      migrations.addMigration(1, 2, (oldStores) => ({
        ...oldStores,
        settings: { appearance: { theme: oldStores.settings.theme } },
      }))

      new Settings<any>({
        filename: 'migration-test',
        version: 2,
        migrations,
      })

      jest.runAllTimers()

      expect(configRepo.writeConfigJson).not.toHaveBeenCalled()
    })
  })
})
