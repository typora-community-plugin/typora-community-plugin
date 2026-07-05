# Statistics API

The Statistics module allows plugins to register custom statistic rows in Typora's word-count panel (accessible via `Ctrl+Shift+W`). Registered statistics display alongside built-in stats like word count, character count, and reading time.

## Register a Statistic

### Register a regular statistic row

Add new rows with the `registerStatistic()` method:

```js
// typora-plugin-example /src/main.ts

export default class extends Plugin {
  onload() {
    this.app.plugins.registerStatistic({
      id: 'my-stat',
      name: 'My Statistic',
      eval(context) {
        const markdown = context.markdown
        // compute your value...
        return '42'
      }
    })
  }
}
```

### Register a selection statistic row

Register a statistic row in the "Selection" section of the word-count panel with the `registerSelectionStatistic()` method:

```js
// typora-plugin-example /src/main.ts

export default class extends Plugin {
  onload() {
    this.app.plugins.registerSelectionStatistic({
      id: 'selected-lines',
      name: 'Selected Lines',
      eval(context) {
        const selectionText = context.selectionText
        const lines = selectionText.split('\n').filter(l => l.trim()).length
        return lines > 0 ? String(lines) : null
      }
    })
  }
}
```

Both registration methods return a dispose function. Calling it unregisters the statistic and removes its DOM row.

```js
const dispose = this.app.plugins.registerStatistic(...)
// ...when you need to unregister later
dispose()
```

## StatisticHandler

The handler object passed to `registerStatistic()` / `registerSelectionStatistic()` contains the following fields:

| Field         | Type                                              | Description                                                                                         |
| ------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `id`          | `string`                                          | Unique identifier across all registered statistics (including both regular and selection stats). Serves as the DOM ID prefix (`typ-wc-{id}` for regular, `typ-wc-sel-{id}` for selection). Must not collide with other registrations. |
| `name`        | `string`                                          | Name / unit label displayed in the statistic row.                                                   |
| `eval(context)` | `(context: StatisticContext) => string \| null`   | Computes the value of this statistic.                                                                 |

The `eval()` method is called when the word-count panel opens, markdown content changes, or the selection area changes. Return a non-null string to display the value, or return `null` to hide the row.

## StatisticContext

The context object passed to `eval()` provides the following:

### `context.markdown` — Current document content

```ts
get markdown(): string
```

Lazily reads the current document's Markdown content, only once; subsequent accesses return the cached value.

### `context.selectionText` — Selected text

```ts
get selectionText(): string
```

Reads the current plain-text selection from the DOM (non-Markdown). Returns an empty string when there is no selection.

### `context.get(id)` — Cross-statistic value sharing

```ts
get(id: string): string | null
```

Retrieves a previously computed statistic value by ID, allowing one statistic to depend on another:

- For Typora built-in bottom stats (`reading-time`, `lines`, `words`, `characters`, `selected-words`, `selected-characters`), falls back to lazily reading from the raw DOM if no previously computed value exists.
- Returns `null` if the statistic has not been computed yet or was hidden.

```js
eval(context) {
  const wordCount = context.get('words')
  // use wordCount for your computation...
}
```

### `context.set(id, value)` — Store computed results

```ts
set(id: string, value: string | null): void
```

Stores a result under a statistic ID so other statistics can read it via `get()`. Pass `null` to indicate the statistic has been hidden or skipped. You can use your own unique ID or another registered statistic's ID.

## Platform Compatibility

> **Note:** The Statistics module is only compatible with Windows and Linux, as it depends on Typora-specific DOM structures that differ on macOS.
