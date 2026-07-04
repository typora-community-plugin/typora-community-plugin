import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import { memorize } from 'src/utils'


export const useEditingTabs = memorize(() => {
  let editingTabs: WorkspaceTabs | null = null

  return {
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
