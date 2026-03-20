type Schema = Record<string, string>

type KeyOf<T> = Extract<keyof T, string>


class Table<T, TKey = any> {

  constructor(private dbInst: MiniDexie, private name: string) {}

  /**
   * Internal helper to get a specific ObjectStore
   */
  private async _getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.dbInst._getDb()
    const transaction = db.transaction(this.name, mode)
    return transaction.objectStore(this.name)
  }

  /**
   * Helper to convert IDBRequest to Promise
   */
  private _promisify<R>(request: IDBRequest<R>): Promise<R> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Add a new record
   */
  async add(data: T): Promise<TKey> {
    const store = await this._getStore('readwrite')
    return this._promisify(store.add(data)) as unknown as Promise<TKey>
  }

  /**
   * Update an existing record or add if it doesn't exist
   */
  async put(data: T): Promise<TKey> {
    const store = await this._getStore('readwrite')
    return this._promisify(store.put(data)) as unknown as Promise<TKey>
  }

  /**
   * Get a record by primary key
   */
  async get(id: TKey): Promise<T | undefined> {
    const store = await this._getStore('readonly')
    return this._promisify(store.get(id as any))
  }

  /**
   * Get all records from the table
   */
  async toArray(): Promise<T[]> {
    const store = await this._getStore('readonly')
    return this._promisify(store.getAll())
  }

  /**
   * Delete a record by primary key
   */
  async delete(id: any): Promise<void> {
    const store = await this._getStore('readwrite')
    return this._promisify(store.delete(id))
  }

  /**
   * Basic filter implementation
   * Use index if available, otherwise fallback to manual filter
   */
  where(key: KeyOf<T>) {
    return {
      equals: async (value: any): Promise<T[]> => {
        const store = await this._getStore('readonly')

        // Use IDBIndex if the field is indexed
        const useIndex = store.indexNames.contains(key)
        const request = useIndex ? store.index(key).getAll(value) : store.getAll()

        const results = await this._promisify(request)
        // If no index, perform manual filtering (scan)
        return useIndex ? results : results.filter((item: any) => item[key] === value)
      }
    }
  }
}


export class MiniDexie {

  private dbName: string
  private _db: IDBDatabase | null = null
  private _schema: Schema = {}
  private _version: number = 1;

  // Dynamic table access: db.friends
  [key: string]: any

  constructor(dbName: string) {
    this.dbName = dbName
  }

  /**
   * Define the database version
   */
  version(v: number) {
    this._version = v
    return {
      /**
       * Define the table schemas
       * @example
       *   { friends: "++id, name, age" }
       *   { friends: "guid, name, age" }
       */
      stores: (schema: Schema): this => {
        this._schema = schema
        Object.keys(schema).forEach(tableName => {
          (this as any)[tableName] = new Table(this, tableName)
        })
        return this
      }
    }
  }

  /**
   * Open the database connection or return the existing one (Lazy Loading)
   */
  async _getDb(): Promise<IDBDatabase> {
    if (this._db) return this._db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this._version)

      // Handle schema creation and migration
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase
        for (const [tableName, schemaStr] of Object.entries(this._schema)) {
          const keys = schemaStr.split(',').map(s => s.trim())
          const primaryKey = keys[0] // The first key is always the primary key

          if (!db.objectStoreNames.contains(tableName)) {
            const store = db.createObjectStore(tableName, {
              keyPath: primaryKey.replace('++', ''), // "++id" -> "id"
              autoIncrement: primaryKey.startsWith('++')
            })

            // Create indexes for subsequent keys
            keys.slice(1).forEach(key => {
              store.createIndex(key, key, { unique: false })
            })
          }
        }
      }

      request.onsuccess = () => {
        this._db = request.result
        resolve(this._db)
      }
      request.onerror = () => reject(request.error)
    })
  }
}
