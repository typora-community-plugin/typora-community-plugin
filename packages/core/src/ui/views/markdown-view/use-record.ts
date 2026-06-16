import { memoize } from "lodash"
import type { MarkdownView } from "src/ui/views/markdown-view"


export const useRecord = memoize(() => {
  return {
    saveStateToLeaf(view: MarkdownView) {
      view.leaf.state = { ...view.leaf.state, ...view.getState() }
    },
    restoreStateFromLeaf(view: MarkdownView) {
      view.setState(view.leaf.state)
    },
  }
})
