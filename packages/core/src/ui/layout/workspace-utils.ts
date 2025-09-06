import { useService } from "src/common/service"
import type { Direction, WorkspaceSplit } from "./split"
import { WorkspaceLeaf } from "./workspace-leaf"
import { MarkdownView } from "../views/markdown-view"
import { EmptyView } from "../views/empty-view"
import type { ViewState } from "../view-manager"
import { uniqueId } from "src/utils"


export function createTabs(path?: string) {
  const workspace = useService('workspace')
  const tabs = useService('workspace-tabs')
  const newLeaf = path
    ? path.startsWith('typ://')
      ? createCustomLeaf(path)
      : createEditorLeaf(path)
    : createEmptyLeaf()
  tabs.appendChild(newLeaf)
  workspace.activeLeaf = newLeaf
  return tabs
}

export function createLeaf(state?: ViewState) {
  const leaf = new WorkspaceLeaf()
  if (state) leaf.setState(state)
  return leaf
}

export function createEditorLeaf(filePath: string) {
  return createLeaf({
    type: MarkdownView.type,
    state: {
      path: filePath,
    }
  })
}

const RE_TYPE = /^typ:\/\/([^/]+)/

function createCustomLeaf(path: string) {
  return createLeaf({
    type: path.match(RE_TYPE)[1],
    state: {
      path,
    }
  })
}

export function createEmptyLeaf() {
  return createLeaf({
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
