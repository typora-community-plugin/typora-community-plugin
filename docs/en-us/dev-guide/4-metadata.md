# Metadata API

The Metadata API builds a metadata index for note files and caches the results in memory and IndexedDB. Plugins can register providers to compute custom metadata for files with a given extension, and then query it by relative path.

Access the `MetadataManager` instance via `app.metadata`.



## Registering a Provider

```ts
import { Plugin } from '@typora-community-plugin/core'

export default class extends Plugin {
  onload() {
    this.register(
      this.app.metadata.register('md', async (ctx) => {
        const text = await ctx.text()
        const wikilinks = [...text.matchAll(/\[\[([^\]]+)\]\]/g)]
          .map(match => match[1])

        return {
          metadata: {
            wikilinks,
          },
        }
      }))
  }
}
```

- The extension may or may not have a leading `.`; it is normalized to lowercase internally.
- `register()` returns an unregister function; in a plugin, simply use `this.register(...)`.
- Errors thrown by a provider are caught and logged as warnings; that provider's result is merged as `{}` and other providers are not interrupted.
- Registering/unregistering a provider invalidates the cache for that extension and reprocesses it, so stale results are not kept when the mtime is unchanged.



## MetadataProviderContext

| Member | Description |
| --- | --- |
| `filePath` | Absolute path of the current file. |
| `text()` | Read the file text. Read only once; subsequent calls return the cached value. |
| `fileStats()` | Returns the `fs.stat()` result (`mtimeMs`, `size`, etc.). |

> `text()` is asynchronous; `fileStats()` is synchronous and is already available when the provider runs.



## Return Value and Cache Structure

A provider returns a plain object; results from all providers are merged by extension. Cache entry structure:

```ts
type CacheEntry = {
  mtime: number
  providerSignature?: string
  metadata: {
    frontmatter: Record<string, any>
    tags: Array<{ name: string, ... }>
    [key: string]: any
  }
  [key: string]: any
}
```

Core registers two providers by default:

- `basicMeta`: writes `mtime` and `size`;
- `markdown`: parses `metadata.frontmatter`, `metadata.tags`, and `metadata.titles`.

So a typical cache entry for a Markdown file looks like:

```ts
{
  mtime: 1730000000000,
  size: 2048,
  providerSignature: 'abc123',
  metadata: {
    frontmatter: { title: 'Hello' },
    tags: [{ name: 'todo', lineText: '#todo', lineNumber: 3 }],
    titles: [{ name: 'Hello', lineText: '# Hello', lineNumber: 1 }],
    // fields written by your provider
  },
}
```



## Merge Strategy

The `merge` option of `register(ext, provider, { merge })` declares array merge behavior by dot path:

```ts
this.app.metadata.register('md', myProvider, {
  merge: {
    'metadata.tags': 'concatUnique',
    '*': 'concat',
  },
})
```

| Strategy | Description |
| --- | --- |
| `replace` | The later provider's value overwrites directly. |
| `deep` | Plain objects are merged recursively. |
| `concat` | Arrays are concatenated. |
| `concatUnique` | Arrays are deduplicated and concatenated; objects are deduplicated by `name`, other values by JSON. |

Default behavior: plain objects are deep-merged and other values are overwritten. `'*'` is only used as a fallback strategy for array values.



## Querying and Updating

| Method | Description |
| --- | --- |
| `index()` | Index the entire current notes folder. |
| `get(relativePath)` | Query the cache by a path **relative to the notes folder**. |
| `update(filePath, content?)` | Reprocess a single file (pass an absolute path). When `content` is passed, the disk content is ignored and the given text is used. |
| `remove(filePath)` | Remove a file or an entire folder subtree from the cache (absolute path). |
| `rename(oldPath, newPath)` | Move a file or folder subtree in the cache (absolute paths). |
| `clear()` | Clear the in-memory cache and close the IndexedDB connection of the current notes folder. |

```ts
const entry = this.app.metadata.get('notes/hello.md')

console.log(entry?.metadata.frontmatter)
console.log(entry?.metadata.tags.map(tag => tag.name))
```

> Mismatched path parameters are a common mistake: `get()` uses a relative path, while `update()` / `remove()` / `rename()` use absolute paths.



## Events

Listen via `app.metadata.on(...)`:

| Event | Parameters | Description |
| --- | --- | --- |
| `index:start` | `(total: number)` | Full indexing started; `total` is the number of files to process. |
| `index:progress` | `(current: number)` | Number of files processed. |
| `index:done` | none | Full indexing finished. This is a sticky event: subscribing after completion still fires it immediately. |
| `index:update` | `(relativePath: string)` | Metadata of a single file was updated. |
| `index:remove` | `(relativePath: string)` | Metadata of a single file was removed. |

```ts
this.register(
  this.app.metadata.on('index:done', () => {
    console.log('index ready')
  }))
```



## Full Indexing

Full indexing does not run automatically when plugins load. Call it explicitly when you need a complete index:

```ts
await this.app.metadata.index()
```

Core's built-in `internal.metadata` plugin (disabled by default) runs a full index once after `app` finishes loading. Third-party plugins should not assume the index already exists.



## Synchronization

- When a file is saved, it is recomputed using the unsaved content from the editor;
- When files are deleted or files/folders are renamed, the cache is updated accordingly;
- When switching notes folders, the cache connection is rebuilt;
- Synced with Typora's native Quick Open worker, so files opened from the quick-open panel also enter the index;
- Incremental updates process at most 10 files concurrently by default, avoiding file descriptor exhaustion.

Index results are stored in IndexedDB keyed by the notes folder id. After a restart, the cache is loaded first, and whether to reprocess is decided by mtime and the provider signature.



## Notes

- `index()` is asynchronous. When you need complete data, `await index()` or listen for `index:done`.
- `get()` only reads the current in-memory cache; it may return `undefined` before indexing starts or when the file has not been processed yet.
- Query results are cache references; do not modify them directly. To change values, recompute them in a provider.
- Indexing traverses the entire notes folder, so providers should avoid expensive operations; `text()` already caches a single read.
