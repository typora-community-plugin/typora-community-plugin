import { editor } from "typora"
import type { Component } from "src/common/component"
import { useService } from "src/common/service"
import type { MarkdownView } from "src/ui/views/markdown-view"
import { until } from "src/utils"


export function useScrollRecord(registry: Component, workspace = useService('workspace')) {

  registry.register(
    workspace.on('file:will-open', (file) => {
      if (!file.endsWith('.md')) return

      const leaf = workspace.activeLeaf
      if (!leaf) return

      leaf.state.scrollTop = (leaf.view as MarkdownView).isEidtor()
        ? editor.writingArea.parentElement.scrollTop
        : leaf.view.containerEl.scrollTop
    }))

  registry.register(
    workspace.on('file:open', (file) => {
      if (!file.endsWith('.md')) return

      const leaf = workspace.rootSplit.findLeaf(l => l.state.path === file)
      if (!leaf?.state?.scrollTop) return

      const leafEl = leaf.view.containerEl
      const savedScrollTop = leaf.state.scrollTop
      until(() => leafEl.scrollTop !== savedScrollTop).then(() => {
        if ((leaf.view as MarkdownView).isEidtor())
          editor.writingArea.parentElement.scrollTop = savedScrollTop
        else
          leafEl.scrollTop = savedScrollTop
      })
    }))

}
