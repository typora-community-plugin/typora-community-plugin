# General UI Components

Core provides several UI components that plugins can use directly: notices, modals, quick input/pick, and status bar elements.



## Notice

Used to show floating short messages:

```ts
import { Notice } from '@typora-community-plugin/core'

new Notice('Plain message')
new Notice('Closes after 5 seconds', 5000)
new Notice('Does not close automatically', 0)

Notice.success('Saved successfully')
Notice.warning('Incomplete configuration')
Notice.error('Failed to load')
```

| Member | Description |
| --- | --- |
| `new Notice(message, duration?)` | Create and show immediately. `duration` defaults to `5000` ms; pass `0` to keep it open. |
| `new Notice(message, options?)` | `options.type` is `'success' \| 'warning' \| 'error'`; `duration` can be set at the same time. |
| `Notice.info / success / warning / error(message, duration?)` | Static shortcut methods. |
| `setMessage(message)` | Update the text. |
| `close()` | Close immediately. |

> The message content is inserted as HTML, so never pass unescaped user input.



## Modal

```ts
import { Modal } from '@typora-community-plugin/core'

const modal = new Modal({ className: 'my-modal' })
  .setHeader('Title')
  .setBody(body => {
    body.textContent = 'Content'
  })
  .setFooter(footer => {
    const ok = document.createElement('button')
    ok.textContent = 'OK'
    ok.onclick = () => modal.close()
    footer.append(ok)
  })
  .onClose(() => {
    // callback when closed
  })

modal.open()
```

| Method | Description |
| --- | --- |
| `new Modal({ className? })` | Mounts the DOM into `document.body` at construction time; hidden by default. |
| `setHeader(text)` | Set the title. |
| `setBody(build)` | Customize the content area. |
| `setFooter(build)` | Customize the footer area; calling it again clears and rebuilds it. |
| `onClose(callback)` | Register a close callback (triggered by clicking the overlay, pressing Esc, or calling `close()`). |
| `open()` / `close()` | Show / hide. |

`containerEl`, `modal`, `header`, `body`, and `footer` of a `Modal` can all be accessed directly.

> `close()` only hides the DOM; it does not remove it. If you need thorough cleanup when the plugin unloads, use:
>
> ```ts
> this.register(() => modal.containerEl.remove())
> ```



## Quick Input

```ts
import { openInputBox } from '@typora-community-plugin/core'

const value = await openInputBox({
  title: 'Rename',
  placeholder: 'Enter a new name',
  prompt: 'Press Enter to confirm, Esc to cancel',
})

if (value !== undefined) {
  console.log('input:', value)
}
```

Returns `undefined` when cancelled.



## Quick Pick

```ts
import { openQuickPick } from '@typora-community-plugin/core'

const picked = await openQuickPick(
  [
    { label: 'Group A', kind: -1 }, // -1 renders as a separator title
    { label: 'Option 1' },
    { label: 'Option 2' },
  ],
  {
    title: 'Choose an option',
    placeholder: 'Type to filter',
  })

if (picked) {
  console.log(picked.label)
}
```

Multiple selection:

```ts
const pickedList = await openQuickPick(
  [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
  { title: 'Multiple selection', canPickMany: true })

if (pickedList) {
  console.log(pickedList.map(item => item.label))
}
```

| Parameter | Description |
| --- | --- |
| `items` | `{ label: string, kind?: number }[]`. `kind: -1` renders as a group title. |
| `options.title` | Title. |
| `options.placeholder` | Placeholder text of the search box. |
| `options.canPickMany` | Whether to allow multiple selection. When enabled, an array or `undefined` is returned. |

> The `QuickPickItemKind` enum is not exported from the package entry; to add a separator title, use `kind: -1` directly.



## Status Bar

`Plugin.addStatusBarItem()` adds an element to Typora's bottom status bar and removes it automatically when the plugin unloads:

```ts
export default class extends Plugin {
  onload() {
    const el = this.addStatusBarItem({
      position: 'left',
      type: 'item',
      hint: 'Current character count',
    })

    el.textContent = '0 chars'
  }
}
```

```ts
addStatusBarItem(options?: {
  position: 'left' | 'right'
  hint?: string
  /** defaults to 'button' */
  type?: 'item' | 'button'
}): HTMLElement
```

| Option | Description |
| --- | --- |
| `position` | Show on the left or right side of the status bar. |
| `hint` | Hover tooltip (`ty-hint` attribute). |
| `type` | `'item'` is always visible; `'button'` is hidden by default and appears when hovering over the status bar. |

> The return value is a plain `HTMLElement`; you can freely change its content and styles.



## Examples

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets)
