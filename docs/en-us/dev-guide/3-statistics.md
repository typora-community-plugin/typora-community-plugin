# Statistics

The Statistics API allows plugins to register custom statistic rows in Typora's word-count panel. Registered statistics are displayed alongside built-in stats such as word count, character count, and reading time.

> The word-count panel is provided by Typora natively (usually <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>W</kbd> on Windows/Linux); it is not a command registered by core.

> **Platform limitation**
>
> Statistics relies on Typora-specific DOM structures and is currently only compatible with Windows and Linux; it is unavailable on macOS.



## Registering a Statistic

Access the Statistics instance via `app.features.statistics`:

### Regular Statistic Row

```ts
import { Plugin } from '@typora-community-plugin/core'

export default class extends Plugin {
  onload() {
    this.register(
      this.app.features.statistics.registerStatistic({
        id: 'my-stat',
        name: 'My statistic',
        eval(context) {
          const markdown = context.markdown
          return String(markdown.length)
        },
      }))
  }
}
```

### Selection Statistic Row

```ts
this.register(
  this.app.features.statistics.registerSelectionStatistic({
    id: 'selected-lines',
    name: 'Selected lines',
    eval(context) {
      const lines = context.selectionText.split('\n').filter(l => l.trim()).length
      return lines > 0 ? String(lines) : null
    },
  }))
```

Both registration methods return an unregister function. Calling it removes the statistic and its DOM row:

```ts
const dispose = this.app.features.statistics.registerStatistic(/* ... */)
dispose()
```

In a plugin, simply use `this.register(...)` to unregister automatically on unload.



## StatisticHandler

```ts
import type { StatisticHandler } from '@typora-community-plugin/core'

type StatisticHandler = {
  id: string
  name: string
  eval(context: StatisticContext): string | null
}
```

| Field | Description |
| --- | --- |
| `id` | Statistic identifier, used as a DOM id prefix: `typ-wc-{id}` for regular statistics and `typ-wc-sel-{id}` for selection statistics. |
| `name` | Name/unit label displayed in the statistic row. It is inserted as HTML, so use plain text and never pass untrusted content. |
| `eval(context)` | Computes the statistic value. Return a string to display it, or `null` to hide the row. |

> **Note**: Regular and selection statistics are deduplicated separately, so the same `id` can be registered in both areas; registering the same id twice within one area throws.



## StatisticContext

### `context.markdown`

```ts
get markdown(): string
```

Lazily reads the current document's Markdown content, only once; subsequent accesses return the cached value.

> Reading goes through the `presave` stage of Markdown preprocessors, so it may trigger text replacements registered by plugins.

### `context.selectionText`

```ts
get selectionText(): string
```

Reads the current selected plain text from the DOM (not Markdown). Returns an empty string when there is no selection.

### `context.get(id)`

```ts
get(id: string): string | null
```

Reads a statistic value already computed in the current round, allowing one statistic to depend on another.

- Built-in statistic ids: `reading-time`, `lines`, `words`, `characters`, `selected-words`, `selected-characters`;
- If a built-in statistic has not been computed yet, it is lazily read from Typora's bottom DOM;
- Returns `null` when another statistic has not been computed or is hidden.

Statistics in the same area are computed in registration order and share the same `context`, so later-registered statistics can read the results of earlier ones.

```ts
eval(context) {
  const words = Number(context.get('words') ?? 0)
  return words > 1000 ? 'Long' : 'Short'
}
```

### `context.set(id, value)`

```ts
set(id: string, value: string | null): void
```

Writes a result into the current context for later statistics to read via `get()`. Passing `null` means hidden or skipped. You can use your own id or another statistic's id.

> After each round of computation, Statistics automatically writes the current statistic's result into `context`; you usually do not need to call `set()` manually.



## Update Timing

`eval()` is called at the following times:

- when the word-count panel opens;
- when document content or the selection changes and Typora updates the word count.

Updates are throttled to 167ms. Registering while the panel is closed is also safe: registered items are injected the next time the panel opens.



## Examples

- Core's built-in test plugin `plugin-test` registers both a regular statistic and a selection statistic; see `packages/core/src/plugin-internal/plugins/plugin-test.ts`.
