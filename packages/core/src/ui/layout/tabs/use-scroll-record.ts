import type { Component } from "src/common/component"
import { useEventBus } from "src/common/eventbus"
import type { MarkdownView } from "src/ui/views/markdown-view"
import type { ScrollState } from "../workspace-view"


export function useScrollRecord(registry: Component) {

  registry.register(
    useEventBus('workspace-root').on('leaf:will-close', leaf => {
      if (!leaf.state.path.endsWith('.md')) return

      const view = leaf.view as MarkdownView
      leaf.state.scroll = view.getScroll()
    }))

  registry.register(
    useEventBus('workspace-root').on('leaf:active', leaf => {
      if (!leaf.state.path.endsWith('.md')) return
      if (leaf.state.scroll == null) return

      setTimeout(() => {
        leaf.view.applyScroll(leaf.state as ScrollState)
      })
    }))
}
