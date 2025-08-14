import { useService } from "src/common/service"
import type { Direction, WorkspaceSplit } from "./split"
import { uniqueId } from "src/utils"
import { MarkdownView } from "../views/markdown-view"
import { EmptyView } from "../views/empty-view"


export function createTabs(path?: string) {
  const workspace = useService('workspace')
  const tabs = useService('workspace-tabs')
  tabs.appendChild(workspace.activeLeaf =
    path
      ? createEditorLeaf(path)
      : createEmptyLeaf()
  )
  return tabs
}

export function createEditorLeaf(filePath: string) {
  return useService('workspace').createLeaf({
    type: MarkdownView.type,
    state: {
      path: filePath,
    }
  })
}

export function createEmptyLeaf() {
  return useService('workspace').createLeaf({
    type: EmptyView.type,
    state: {
      path: uniqueId(`typ://${EmptyView.type}/`) + '/New tab',
    }
  })
}

export function splitRight(path?: string) {
  split('vertical', path)
}

export function splitDown(path?: string) {
  split('horizontal', path)
}

function split(direction: Direction, path?: string) {
  const workspace = useService('workspace')
  const previousTabs = workspace.activeLeaf.closest('tabs')
  const parentSplit = previousTabs.closest('split') as WorkspaceSplit
  if (parentSplit.direction === direction)
    parentSplit.appendChild(createTabs(path))
  else {
    const newSplit = useService('workspace-split', [direction])
    parentSplit.replaceChild(previousTabs, newSplit)
    newSplit.appendChild(previousTabs)
    newSplit.appendChild(createTabs(path))
  }
}
