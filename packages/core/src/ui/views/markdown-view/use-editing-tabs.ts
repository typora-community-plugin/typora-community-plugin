import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import { memorize } from 'src/utils'


export const useEditingTabs = memorize(() => {
  let editingTabs: WorkspaceTabs | null = null

  return {
    /**
     * @tips Cannot be used outside the Workspace API; otherwise, `null` will be returned after the Workspace is disabled.
     */
    editingTabs(): WorkspaceTabs | null {
      return editingTabs
    },
    setEditingTabs(tabs: WorkspaceTabs | null) {
      editingTabs = tabs
    },
    isEditingTabs(tabs: WorkspaceTabs): boolean {
      return editingTabs === tabs
    },
    isEditingSingleChildTabs(): boolean {
      return editingTabs?.children.length === 1
    },
  }
})
