import type { WorkspaceLeaf } from "src/ui/layout/workspace-leaf"
import { memorize } from "src/utils"


export const usePreviewTabToSwap = memorize(() => {
  let previewTabToSwap: WorkspaceLeaf | null = null
  // Leaves involved in a swap. The "open the next md leaf" fix in
  // `MarkdownView#onClose()` must not reopen them: a teardown right after a
  // swap (e.g. `core.workspace:reset`) detaches the only editor leaf, the fix
  // reopens the swapped preview leaf (`autoSetMode` → 'typora' → native
  // `openFile`), and the reloaded workspace handlers open the file a second
  // time, leaving a duplicate tab in the non-editing tabs group.
  // Marks are cleared when a leaf enters 'typora' mode or the leaf closes.
  const leavesInSwap = new Set<WorkspaceLeaf>()

  return {
    beginSwap(leaf: WorkspaceLeaf): void {
      previewTabToSwap = leaf
    },
    endSwap(): void {
      previewTabToSwap = null
    },

    markLeafInSwap(leaf: WorkspaceLeaf): void {
      leavesInSwap.add(leaf)
    },
    unmarkLeafInSwap(leaf: WorkspaceLeaf): void {
      leavesInSwap.delete(leaf)
    },
    isLeafInSwap(leaf: WorkspaceLeaf): boolean {
      return leavesInSwap.has(leaf)
    },

    previewFileToSwap(): string | null {
      return previewTabToSwap?.state.path
    },
    isPreviewFileToSwap(path: string): boolean {
      return previewTabToSwap?.state.path === path
    },
  }
})
