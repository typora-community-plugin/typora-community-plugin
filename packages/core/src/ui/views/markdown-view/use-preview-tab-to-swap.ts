import { WorkspaceLeaf } from "src/ui/layout/workspace-leaf"
import { memorize } from "src/utils"


export const usePreviewTabToSwap = memorize(() => {
  let previewTabToSwap: WorkspaceLeaf | null = null

  return {
    beginSwap(leaf: WorkspaceLeaf): void {
      previewTabToSwap = leaf
    },
    endSwap(): void {
      previewTabToSwap = null
    },

    previewFileToSwap(): string | null {
      return previewTabToSwap?.state.path
    },
    isPreviewFileToSwap(path: string): boolean {
      return previewTabToSwap?.state.path === path
    },
  }
})
