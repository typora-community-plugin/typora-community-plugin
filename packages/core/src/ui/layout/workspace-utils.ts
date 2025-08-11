import { useService } from "src/common/service"
import type { Direction, WorkspaceSplit } from "./split"
import { uniqueId } from "src/utils"


export function createTabs(path?: string) {
  const workspace = useService('workspace')
  const tabs = useService('@@tabs')
  tabs.appendChild(workspace.activeLeaf =
    path
      ? createEditorLeaf(path)
      : createEmptyLeaf()
  )
  return tabs
}

export function createEditorLeaf(filePath: string) {
  return useService('workspace').createLeaf({
    type: 'core.markdown',
    state: {
      path: filePath,
    }
  })
}

export function createEmptyLeaf() {
  return useService('workspace').createLeaf({
    type: 'core.empty',
    state: {
      path: uniqueId('typ://') + '/New tab',
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
  const left = workspace.activeLeaf.closest('tabs')
  const parentSplit = left.closest('split') as WorkspaceSplit
  if (parentSplit.direction === direction)
    parentSplit.appendChild(createTabs(path))
  else {
    const verticalSplit = useService('@@split', [direction])
    parentSplit.replaceChild(left, verticalSplit)
    verticalSplit.appendChild(left)
    verticalSplit.appendChild(createTabs(path))
  }
}
