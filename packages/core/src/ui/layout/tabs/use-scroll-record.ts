import { editor } from "typora"
import type { Component } from "src/common/component"
import { useEventBus } from "src/common/eventbus"
import type { MarkdownView } from "src/ui/views/markdown-view"


export function useScrollRecord(registry: Component, rootSplit = useEventBus('workspace-root')) {

  registry.register(
    rootSplit.on('leaf:will-deactive', (leaf) => {
      if (!leaf.state.path.endsWith('.md')) return

      leaf.state.scrollTop = (leaf.view as MarkdownView).isEidtor()
        ? editor.writingArea.parentElement.scrollTop
        : leaf.view.containerEl.scrollTop
    }))

  registry.register(
    rootSplit.on('leaf:active', (leaf) => {
      if (!leaf.state.path.endsWith('.md')) return
      if (!leaf.state.scrollTop) return

      setTimeout(() => {
        if ((leaf.view as MarkdownView).isEidtor())
          editor.writingArea.parentElement.scrollTop = leaf.state.scrollTop
        else
          leaf.view.containerEl.scrollTop = leaf.state.scrollTop
      }, 100)
    }))

}
