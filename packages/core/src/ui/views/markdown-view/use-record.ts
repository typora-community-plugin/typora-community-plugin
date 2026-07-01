import type { MarkdownView } from "src/ui/views/markdown-view"
import { memorize } from "src/utils"


export const useRecord = memorize(() => {
  return {
    saveStateToLeaf(view: MarkdownView) {
      view.leaf.state = { ...view.leaf.state, ...view.getState() }
    },
    restoreStateFromLeaf(view: MarkdownView) {
      view.setState(view.leaf.state)
    },
  }
})
