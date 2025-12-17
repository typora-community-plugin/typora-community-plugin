import { editor } from "typora"
import type { Component } from "src/common/component"
import { useService } from "src/common/service"
import type { MarkdownView } from "src/ui/views/markdown-view"


export function useScrollRecord(registry: Component, workspace = useService('workspace')) {

  registry.register(
    workspace.on('file:will-open', (file) => {
      if (!file.endsWith('.md')) return

      const leaf = workspace.rootSplit.findLeaf(l => l.state.path === file)
      leaf.state.scrollTop = (leaf.view as MarkdownView).isEidtor()
        ? editor.writingArea.parentElement.scrollTop
        : leaf.view.containerEl.scrollTop
    }))

  registry.register(
    workspace.on('file:open', (file) => {
      if (!file.endsWith('.md')) return

      const leaf = workspace.rootSplit.findLeaf(l => l.state.path === file)
      if (!leaf?.state?.scrollTop) return

      setTimeout(() => {
        if ((leaf.view as MarkdownView).isEidtor())
          editor.writingArea.parentElement.scrollTop = leaf.state.scrollTop
        else
          leaf.view.containerEl.scrollTop = leaf.state.scrollTop
      }, 100)
    }))

}
