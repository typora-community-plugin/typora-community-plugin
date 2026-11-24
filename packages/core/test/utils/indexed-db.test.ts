import 'src/setup-test-env'
import { MiniDexie } from 'src/utils/indexed-db'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'


/**
 * Minimal in-memory IndexedDB used by these tests. It implements only the API
 * surface that `MiniDexie` touches; requests complete on a microtask like the
 * real implementation.
 */
function makeRequest<T>(exec: () => T) {
  const request: any = {}
  queueMicrotask(() => {
    try {
      request.result = exec()
      request.onsuccess?.()
    } catch (error) {
      request.error = error
      request.onerror?.()
    }
  })
  return request
}

class FakeObjectStore {
  records = new Map<any, any>()
  indexes = new Map<string, string>()
  indexNames = { contains: (name: string) => this.indexes.has(name) }

  constructor(
    private keyPath: string,
    private autoIncrement: boolean,
    extraKeys: string[],
  ) {
    for (const key of extraKeys) this.indexes.set(key, key)
  }

  createIndex(key: string) {
    this.indexes.set(key, key)
  }

  index(name: string) {
    return {
      getAll: (value: any) => makeRequest(() =>
        [...this.records.values()].filter(row => row[name] === value)),
    }
  }

  private nextKey(row: any) {
    if (this.autoIncrement && row[this.keyPath] == null) {
      const keys = [...this.records.keys()] as number[]
      row[this.keyPath] = keys.length ? Math.max(...keys) + 1 : 1
    }
    return row[this.keyPath]
  }

  add(row: any) {
    const key = this.nextKey(row)
    if (this.records.has(key)) throw new Error('ConstraintError: duplicate key')
    this.records.set(key, row)
    return makeRequest(() => key)
  }

  put(row: any) {
    return makeRequest(() => {
      const key = this.nextKey(row)
      this.records.set(key, row)
      return key
    })
  }

  get(key: any) {
    return makeRequest(() => this.records.get(key))
  }

  getAll() {
    return makeRequest(() => [...this.records.values()])
  }

  delete(key: any) {
    return makeRequest(() => { this.records.delete(key) })
  }

  clear() {
    return makeRequest(() => { this.records.clear() })
  }
}

class FakeDatabase {
  stores = new Map<string, FakeObjectStore>()
  version = 0
  closed = false
  onclose: (() => void) | null = null
  onversionchange: (() => void) | null = null

  objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  }

  createObjectStore(name: string, options: { keyPath: string, autoIncrement?: boolean }) {
    const store = new FakeObjectStore(options.keyPath, !!options.autoIncrement, [])
    this.stores.set(name, store)
    return store
  }

  transaction(name: string, _mode: string) {
    const store = this.stores.get(name)
    const transaction: any = {
      oncomplete: null,
      onerror: null,
      objectStore: () => store,
    }
    queueMicrotask(() => transaction.oncomplete?.())
    return transaction
  }

  close() {
    this.closed = true
  }
}

const databases = new Map<string, FakeDatabase>()

const open = vi.fn((name: string, version = 1) => {
  const request: any = {}
  const previous = databases.get(name)
  const db = new FakeDatabase()
  // Data persists across connections, but each open returns a new connection.
  db.stores = previous?.stores ?? db.stores
  db.version = previous?.version ?? 0
  databases.set(name, db)

  queueMicrotask(() => {
    request.result = db
    if (version > db.version) {
      db.version = version
      request.onupgradeneeded?.({ target: request })
    }
    if (name === 'broken') {
      request.error = new Error('open failed')
      request.onerror?.()
      return
    }
    request.onsuccess?.()
  })

  return request
})

beforeEach(() => {
  vi.stubGlobal('indexedDB', { open })
  databases.clear()
  open.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})


function createDb(name = 'test-db') {
  return new MiniDexie(name).version(1).stores({
    friends: '++id, name, age',
  }) as any
}

describe('MiniDexie tables', () => {

  test('creates object stores and indexes from the schema', async () => {
    const db = createDb()

    const database = await db._getDb()

    expect(database.objectStoreNames.contains('friends')).toBe(true)
    const store = (database as any).stores.get('friends')
    expect([...store.indexes.keys()]).toEqual(['name', 'age'])
  })

  test('adds records and returns generated keys', async () => {
    const db = createDb()

    await expect(db.friends.add({ name: 'a' })).resolves.toBe(1)
    await expect(db.friends.add({ name: 'b' })).resolves.toBe(2)
    await expect(db.friends.get(2)).resolves.toEqual({ name: 'b', id: 2 })
    await expect(db.friends.toArray()).resolves.toHaveLength(2)
  })

  test('bulkAdd adds several records in one transaction', async () => {
    const db = createDb()

    await db.friends.bulkAdd([{ name: 'a' }, { name: 'b' }])

    await expect(db.friends.toArray()).resolves.toHaveLength(2)
  })

  test('bulkAdd rejects when a record cannot be added', async () => {
    const db = createDb()

    await db.friends.bulkAdd([{ name: 'a' }])

    // Adding the same primary key twice violates the constraint.
    await expect(db.friends.bulkAdd([{ id: 1, name: 'again' }])).rejects.toThrow('duplicate key')
  })

  test('put inserts and replaces records', async () => {
    const db = createDb()

    await db.friends.put({ id: 7, name: 'a' })
    await db.friends.put({ id: 7, name: 'b' })

    await expect(db.friends.get(7)).resolves.toEqual({ id: 7, name: 'b' })
  })

  test('bulkPut inserts several records', async () => {
    const db = createDb()

    await db.friends.bulkPut([{ id: 1, name: 'a' }, { id: 2, name: 'b' }])

    await expect(db.friends.toArray()).resolves.toHaveLength(2)
  })

  test('delete, bulkDelete and clear remove records', async () => {
    const db = createDb()

    await db.friends.bulkAdd([{ name: 'a' }, { name: 'b' }, { name: 'c' }])
    await db.friends.delete(1)
    await expect(db.friends.toArray()).resolves.toHaveLength(2)

    await db.friends.bulkDelete([2])
    await expect(db.friends.get(2)).resolves.toBeUndefined()

    await db.friends.clear()
    await expect(db.friends.toArray()).resolves.toEqual([])
  })

  test('where().equals uses an index when one exists', async () => {
    const db = createDb()
    await db.friends.bulkAdd([{ name: 'a', age: 1 }, { name: 'b', age: 2 }])

    await expect(db.friends.where('name').equals('a')).resolves.toEqual([{ name: 'a', age: 1, id: 1 }])
  })

  test('where().equals filters manually for non-indexed fields', async () => {
    const db = createDb()
    await db.friends.bulkAdd([{ name: 'a', extra: 'x' }, { name: 'b', extra: 'y' }])

    await expect(db.friends.where('extra').equals('x')).resolves.toEqual([
      { name: 'a', extra: 'x', id: 1 },
    ])
  })

  test('where().equals returns an empty array when nothing matches', async () => {
    const db = createDb()
    await db.friends.add({ name: 'a' })

    await expect(db.friends.where('name').equals('missing')).resolves.toEqual([])
  })
})

describe('MiniDexie connection lifecycle', () => {

  test('opens the database once and reuses the connection', async () => {
    const db = createDb()

    const first = await db._getDb()
    const second = await db._getDb()

    expect(second).toBe(first)
    expect(open).toHaveBeenCalledTimes(1)
  })

  test('rejects when the open request fails', async () => {
    const db = createDb('broken')

    await expect(db._getDb()).rejects.toThrow('open failed')
  })

  test('close() closes the live connection and allows reopening', async () => {
    const db = createDb()
    const database = await db._getDb()

    db.close()

    expect(database.closed).toBe(true)
    const reopened = await db._getDb()
    expect(open).toHaveBeenCalledTimes(2)
    expect(reopened).not.toBe(database)
  })

  test('discards a connection that finishes opening after close()', async () => {
    const db = createDb()

    const pending = db._getDb()
    db.close()

    await expect(pending).rejects.toThrow('connection closed while opening')
    await expect(db._getDb()).resolves.toBeDefined()
  })

  test('close() also closes a pending connection', async () => {
    const db = createDb()

    const pending = db._getDb()
    db.close()

    await expect(pending).rejects.toThrow()
    expect(open).toHaveBeenCalledTimes(1)
  })

  test('onEvict fires when the connection is closed externally', async () => {
    const db = createDb()
    const onEvict = vi.fn()
    db.onEvict = onEvict
    const database = await db._getDb()

    database.onversionchange()

    expect(onEvict).toHaveBeenCalledTimes(1)
    expect(database.closed).toBe(true)

    // A later query reopens the database.
    await db._getDb()
    expect(open).toHaveBeenCalledTimes(2)
  })

  test('onEvict fires from the onclose handler of the live connection', async () => {
    const db = createDb()
    const onEvict = vi.fn()
    db.onEvict = onEvict
    const database = await db._getDb()

    database.onclose()

    expect(onEvict).toHaveBeenCalledTimes(1)
  })
})
