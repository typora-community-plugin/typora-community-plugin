# 通用 UI 组件

core 提供了几类可直接在插件中使用的 UI 组件：通知、模态框、快捷输入/选择，以及状态栏元素。



## Notice

用于显示浮动的短消息：

```ts
import { Notice } from '@typora-community-plugin/core'

new Notice('普通消息')
new Notice('5 秒后关闭', 5000)
new Notice('不会自动关闭', 0)

Notice.success('保存成功')
Notice.warning('配置不完整')
Notice.error('加载失败')
```

| 成员 | 说明 |
| --- | --- |
| `new Notice(message, duration?)` | 创建并立即显示。`duration` 默认 `5000` 毫秒；传 `0` 不自动关闭。 |
| `new Notice(message, options?)` | `options.type` 为 `'success' \| 'warning' \| 'error'`，可同时指定 `duration`。 |
| `Notice.info / success / warning / error(message, duration?)` | 静态快捷方法。 |
| `setMessage(message)` | 更新文本。 |
| `close()` | 立即关闭。 |

> 消息内容会作为 HTML 插入，请勿传入未经转义的用户输入。



## Modal

```ts
import { Modal } from '@typora-community-plugin/core'

const modal = new Modal({ className: 'my-modal' })
  .setHeader('标题')
  .setBody(body => {
    body.textContent = '内容'
  })
  .setFooter(footer => {
    const ok = document.createElement('button')
    ok.textContent = '确定'
    ok.onclick = () => modal.close()
    footer.append(ok)
  })
  .onClose(() => {
    // 关闭时回调
  })

modal.open()
```

| 方法 | 说明 |
| --- | --- |
| `new Modal({ className? })` | 构造时即把 DOM 挂到 `document.body`，默认隐藏。 |
| `setHeader(text)` | 设置标题。 |
| `setBody(build)` | 自定义内容区。 |
| `setFooter(build)` | 自定义底部区，重复调用会清空后重建。 |
| `onClose(callback)` | 注册关闭回调（点击遮罩、按 Esc、调用 `close()` 都会触发）。 |
| `open()` / `close()` | 显示 / 隐藏。 |

`Modal` 的 `containerEl`、`modal`、`header`、`body`、`footer` 都可以直接访问。

> `close()` 只隐藏 DOM，不会移除。插件卸载时如需彻底清理，使用：
>
> ```ts
> this.register(() => modal.containerEl.remove())
> ```



## 快捷输入

```ts
import { openInputBox } from '@typora-community-plugin/core'

const value = await openInputBox({
  title: '重命名',
  placeholder: '输入新名称',
  prompt: '按 Enter 确认，Esc 取消',
})

if (value !== undefined) {
  console.log('输入了:', value)
}
```

取消时返回 `undefined`。



## 快捷选择

```ts
import { openQuickPick } from '@typora-community-plugin/core'

const picked = await openQuickPick(
  [
    { label: '分组 A', kind: -1 }, // -1 表示分隔标题
    { label: '选项 1' },
    { label: '选项 2' },
  ],
  {
    title: '选择一个选项',
    placeholder: '输入以筛选',
  })

if (picked) {
  console.log(picked.label)
}
```

多选：

```ts
const pickedList = await openQuickPick(
  [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
  { title: '多选', canPickMany: true })

if (pickedList) {
  console.log(pickedList.map(item => item.label))
}
```

| 参数 | 说明 |
| --- | --- |
| `items` | `{ label: string, kind?: number }[]`。`kind: -1` 渲染为分组标题。 |
| `options.title` | 标题。 |
| `options.placeholder` | 搜索框占位文本。 |
| `options.canPickMany` | 是否多选。开启后返回数组或 `undefined`。 |

> `QuickPickItemKind` 枚举没有从包入口导出，需要分隔标题时直接使用 `kind: -1`。



## 状态栏

`Plugin.addStatusBarItem()` 会在 Typora 底部状态栏添加元素，并在插件卸载时自动移除：

```ts
export default class extends Plugin {
  onload() {
    const el = this.addStatusBarItem({
      position: 'left',
      type: 'item',
      hint: '当前字数',
    })

    el.textContent = '0 字'
  }
}
```

```ts
addStatusBarItem(options?: {
  position: 'left' | 'right'
  hint?: string
  /** 默认 'button' */
  type?: 'item' | 'button'
}): HTMLElement
```

| 选项 | 说明 |
| --- | --- |
| `position` | 显示在状态栏左侧或右侧。 |
| `hint` | 悬停提示（`ty-hint` 属性）。 |
| `type` | `'item'` 始终显示；`'button'` 默认隐藏，鼠标悬停状态栏时出现。 |

> 返回的是普通 `HTMLElement`，可以自由修改内容与样式。



## 例子

- [typora-plugin-tag](https://github.com/typora-community-plugin/typora-plugin-tag)
- [typora-plugin-note-snippets](https://github.com/typora-community-plugin/typora-plugin-note-snippets)
