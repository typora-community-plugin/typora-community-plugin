import { jest } from '@jest/globals'


interface FakeRow { path: string; metadata: any }

const state: {
  instances: any[]
  closed: any[]
  failOpen: boolean
} = { instances: [], closed: [], failOpen: false }

class FakeTable {
  records: FakeRow[] = []

  toArray = jest.fn(async () => this.records)
  clear = jest.fn(async () => { this.records = [] })
  bulkPut = jest.fn(async (rows: FakeRow[]) => { this.records = rows.slice() })
  bulkDelete = jest.fn(async (paths: string[]) => {
    this.records = this.records.filter(r => !paths.includes(r.path))
  })
}

class FakeMiniDexie {
  onEvict?: () => void
  files = new FakeTable()
  private _db = { fake: true }

  constructor(public name: string) {
    state.instances.push(this)
  }

  version(_v: number) {
    return { stores: (_schema: any) => this }
  }

  _getDb = jest.fn(async () => {
    if (state.failOpen) throw new Error('open failed')
    return this._db
  })

  close = jest.fn(() => { state.closed.push(this) })
}

async function setup(): Promise<typeof import('src/metadata/metadata-store')> {
  jest.resetModules()
  state.instances = []
  state.closed = []
  state.failOpen = false

  await jest.unstable_mockModule('src/utils/indexed-db', () => ({ MiniDexie: FakeMiniDexie }))
  return import('src/metadata/metadata-store')
}

const entry = (mtime: number) => ({ mtime, metadata: { frontmatter: {}, tags: [] } })


describe('metadata-store', () => {

  it('round-trips the cache through IndexedDB', async () => {
    const store = await setup()

    await store.saveCache('v1', { 'a.md': entry(111) } as any)
    const loaded = await store.loadCache('v1')

    expect(loaded).toEqual({ 'a.md': entry(111) })
  })

  it('saveCache clears the store before bulkPut', async () => {
    const store = await setup()

    await store.saveCache('v1', { 'a.md': entry(1), 'b.md': entry(2) } as any)

    const db = state.instances[0]
    expect(db.files.clear).toHaveBeenCalledTimes(1)
    expect(db.files.bulkPut).toHaveBeenCalledTimes(1)
    expect(db.files.clear.mock.invocationCallOrder[0])
      .toBeLessThan(db.files.bulkPut.mock.invocationCallOrder[0])
    expect(db.files.bulkPut).toHaveBeenCalledWith([
      { path: 'a.md', metadata: entry(1) },
      { path: 'b.md', metadata: entry(2) },
    ])
  })

  it('deleteCacheEntries is a no-op for an empty list', async () => {
    const store = await setup()

    await store.deleteCacheEntries('v1', [])

    expect(state.instances).toHaveLength(0)
  })

  it('deleteCacheEntries bulk-deletes the given paths', async () => {
    const store = await setup()

    await store.deleteCacheEntries('v1', ['a.md', 'b.md'])

    expect(state.instances[0].files.bulkDelete).toHaveBeenCalledWith(['a.md', 'b.md'])
  })

  it('reuses the opened connection for the same vault', async () => {
    const store = await setup()

    await store.loadCache('v1')
    await store.loadCache('v1')

    expect(state.instances).toHaveLength(1)
    expect(state.instances[0]._getDb).toHaveBeenCalledTimes(1)
  })

  it('opens a separate connection per vault', async () => {
    const store = await setup()

    await store.loadCache('v1')
    await store.loadCache('v2')

    expect(state.instances).toHaveLength(2)
  })

  it('closeCache closes and evicts the connection', async () => {
    const store = await setup()

    await store.loadCache('v1')
    const first = state.instances[0]

    store.closeCache('v1')
    await Promise.resolve()
    await Promise.resolve()

    expect(first.close).toHaveBeenCalledTimes(1)

    await store.loadCache('v1')
    expect(state.instances).toHaveLength(2)
  })

  it('drops the connection when it is evicted externally', async () => {
    const store = await setup()

    await store.loadCache('v1')
    state.instances[0].onEvict?.()

    await store.loadCache('v1')
    expect(state.instances).toHaveLength(2)
  })

  it('returns an empty cache and does not cache a failed open', async () => {
    const store = await setup()

    state.failOpen = true
    const loaded = await store.loadCache('v1')
    expect(loaded).toEqual({})

    state.failOpen = false
    await store.loadCache('v1')
    expect(state.instances).toHaveLength(2)
  })
})
