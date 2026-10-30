# Utilities and Cross-Platform Compatibility Layer

Core exports a small set of cross-platform utilities. Their goal is to let plugins run on both Windows/Linux (which provide Node.js) and macOS (which does not), rather than fully replicating the Node.js APIs.



## fs

`fs` is a `FileAdapter` instance providing common asynchronous file operations:

```ts
import { fs } from '@typora-community-plugin/core'
```

| Method | Description |
| --- | --- |
| `access(path)` | Check whether a path is accessible; rejects if it does not exist. |
| `exists(path)` | Return whether the path exists. |
| `stat(path)` | Return `{ isDirectory(), isFile(), mtimeMs, size }`. |
| `isDirectory(path)` | Whether the path is a directory (faster than `stat()` on macOS). |
| `mkdir(path)` | Create a directory. |
| `copy(src, dest)` | Copy a file. |
| `move(src, dest)` | Move a file. |
| `list(dir)` | Return the **names** of directory entries, without paths. |
| `listFiles(dir, { recursive?, signal? })` | Return **full paths** of files; supports recursion and cancellation. |
| `readText(path)` | Read text asynchronously. |
| `readTextSync(path)` | Read text synchronously. |
| `writeText(path, text)` | Write text. |
| `appendText(path, text)` | Append text. |
| `remove(path)` | Delete a file/directory. |
| `trash(path)` | Move to the trash. |

```ts
const files = await fs.listFiles(vaultPath, { recursive: true })

for (const file of files) {
  if (!file.endsWith('.md')) continue
  const text = await fs.readText(file)
  // ...
}
```

> **Platform differences**
>
> On macOS, `fs` is implemented through Typora's JSBridge, and operations such as `access` / `exists` / `stat` / `mkdir` / `copy` / `move` / `list` / `writeText` / `appendText` can be very slow (on the order of 2 seconds). Avoid calling them frequently in render or scroll paths on macOS.
>
> The `FileAdapter` class itself is not exported from the package entry; use the `fs` instance directly.



## path

```ts
import { path } from '@typora-community-plugin/core'
```

The type only guarantees the following members:

| Member | Description |
| --- | --- |
| `sep` | Path separator. |
| `isAbsolute(path)` | Whether the path is absolute. |
| `basename(path, suffix?)` | File name; an optional suffix can be stripped. |
| `extname(path)` | Extension (starting with a dot). |
| `dirname(path)` | Parent directory. |
| `join(...paths)` | Join paths and resolve `.` / `..`. |
| `relative(from, to)` | Compute a relative path. |

```ts
path.join(vaultPath, 'notes', 'a.md')
path.dirname('/vault/notes/a.md')   // '/vault/notes'
path.extname('a.b.md')              // '.md'
path.relative('/vault', '/vault/notes/a.md') // 'notes/a.md'
```

> On Windows/Linux the underlying implementation is Node.js's `path` module (at runtime it also has `resolve`, `normalize`, etc., but they are not declared in the types); on macOS it is core's browser implementation, which only supports the methods above. For cross-platform safety, use only the members listed above.



## os

```ts
import { os } from '@typora-community-plugin/core'
```

| Method | Description |
| --- | --- |
| `arch()` | CPU architecture, e.g. `x64`, `arm64`. |
| `homedir()` | User home directory. |
| `hostname()` | Host name; the macOS browser implementation returns the User-Agent. |
| `platform()` | `'win32' \| 'linux' \| 'darwin'`. |
| `type()` | `'Windows' \| 'Linux' \| 'Darwin'`. |

> The type only guarantees the members above. On Windows/Linux the underlying implementation is Node.js's `os` module (at runtime it may also have `EOL`, `tmpdir`, `cpus`, etc., but they are not declared); on macOS it is a browser implementation where `homedir()` depends on the loader's `<script src="file:///Users/...">` path and throws if it cannot be found. For cross-platform safety, use only the members listed above.



## debounce

```ts
import { debounce } from '@typora-community-plugin/core'

const onScroll = debounce(() => {
  // ...
}, 200)

const onInput = debounce(() => {
  // runs once immediately, then again `wait` ms after input stops
}, 300, true)
```

Signature: `debounce(func, wait, immediate?)`. The return value is also a function; `cancel()` is not provided.



## format

```ts
import { format } from '@typora-community-plugin/core'

format('Hello, {name}!', { name: 'Typora' }) // 'Hello, Typora!'
```

Uses `{key}` placeholders; when a key is missing, the original `{key}` is kept.



## html

```ts
import { html } from '@typora-community-plugin/core'

const el = html`<div class="my-panel"><span>Hello</span></div>`
document.body.append(el)
```

- Creates elements with jQuery and returns the first root element;
- Use a **single root element** where possible; with multiple roots only the first is returned.



## until

```ts
import { until } from '@typora-community-plugin/core'

const editorEl = await until(() => document.querySelector('#write'))
```

Polls the condition roughly every 352ms until it returns a truthy value. Useful for waiting for Typora's DOM to be ready.

> There is no timeout; if the condition never becomes truthy, the Promise never settles. It cannot be cancelled automatically when the plugin unloads, so add your own timeout or state check for long waits.



## decorate

```ts
import { decorate } from '@typora-community-plugin/core'
```

`decorate` comes from [`@plylrnsdy/decorate.js`](https://www.npmjs.com/package/@plylrnsdy/decorate.js) and provides decorators such as `beforeCall`, `afterCall`, `parameters`, and `returnValue` for intercepting function calls without modifying Typora's source code.

```ts
this.register(
  decorate.returnValue(editor, 'getMarkdown', (args, markdown) => {
    return markdown.replace(/foo/g, 'bar')
  }))
```

| Method | Callback | Description |
| --- | --- | --- |
| `decorate(obj, method, wrapper)` | `(bindedFn, fn) => fn` | Lowest-level decorator. |
| `decorate.parameters(obj, method, wrapper)` | `(args) => args` | Modify call arguments. |
| `decorate.returnValue(obj, method, wrapper)` | `(args, value) => value` | Modify the return value. |
| `decorate.beforeCall(obj, method, listener)` | `(args) => void` | Run before the call. |
| `decorate.afterCall(obj, method, listener)` | `(args, value) => void` | Run after the call; **the return value is ignored**. |

All methods return an unregister function.

> Decorating Typora's internal functions is an unstable practice and may break after Typora upgrades. Prefer the official extension points provided by core.
