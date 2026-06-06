# Statistics API

The Statistics module allows plugins to register custom statistic rows in Typora's word-count footer panel (accessible via `Ctrl+Shift+W`). Registered statistics display alongside built-in stats like word count, character count, and reading time.

## Register a Statistic

Use `registerStatistic()` on the `statistics` service to add a new row:

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

Registered statistics are automatically removed when the plugin is unloaded.

## StatisticHandler

When calling `registerStatistic()`, you pass a handler object with these fields:

| Field   | Type                                              | Description                                                |
| ------- | ------------------------------------------------- | ---------------------------------------------------------- |
| `id`    | `string`                                          | Unique identifier across all registered statistics. Used as the DOM ID prefix (`typ-wc-{id}`). Must not collide with other registrations. |
| `name`  | `string`                                          | Display name / unit label shown in the statistic row.      |
| `eval(context)` | `(context: StatisticContext) => string \| null` | Compute the value for this statistic.                      |

The `eval()` method is called when the word-count panel opens or markdown content changes. Return a non-null string to display the value, or return `null` to hide the row.

## StatisticContext

The context object passed to `eval()` provides:

### `context.markdown` — Current document content

```ts
get markdown(): string
set markdown(value: string)
```

Lazily reads the current document's markdown once; subsequent accesses return the cached value. You can also override it via the setter for testing or custom processing.

### `context.get(id)` — Cross-stat value sharing

```ts
get(id: string): string | null
```

Retrieves a previously computed stat value by its ID, enabling one statistic to depend on another:

- For built-in Typora footer stats (`reading-time`, `lines`, `words`, `characters`), falls back to lazily reading from the raw DOM when no previously computed value exists.
- Returns `null` if the stat hasn't been computed yet or was hidden.

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

Stores a result under any stat ID so it can be read by other statistics via `get()`. Pass `null` to indicate the stat is hidden/skipped. Use your own unique ID or another registered statistic's ID.

## Platform Compatibility

> **Note:** The Statistics module is only compatible with Windows and Linux due to dependencies on Typora-specific DOM structures that differ on macOS.
