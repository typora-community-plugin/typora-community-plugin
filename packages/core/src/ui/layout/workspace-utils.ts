import { useService } from "src/common/service"
import type { Workspace } from "../workspace"
import type { Direction, WorkspaceSplit } from "./split"
import type { WorkspaceTabs } from "./tabs"
import { WorkspaceLeaf } from "./workspace-leaf"
import { MarkdownView } from "../views/markdown-view"
import { EmptyView } from "../views/empty-view"
import type { ViewState } from "../view-manager"
import { uniqueId } from "src/utils"


// ---------- workspace.rootSplit ----------

export function createUntitledTabs() {
  const tabs = useService('workspace-tabs')
  tabs.appendChild(createEditorLeaf(''))
  tabs.once('tab:toggle', () => tabs.removeTab(''))
  return tabs
}

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

export function openFileInActiveTabs(file: string) {
  const workspace = useService('workspace')
  const activeTabs = workspace.activeLeaf?.parent as WorkspaceTabs
  if (activeTabs.findLeaf(leaf => leaf.state.path === file)) {
    workspace.activeLeaf = activeTabs.toggleTab(file)
    return
  }
  activeTabs.appendChild(createEditorLeaf(file))
  workspace.activeLeaf = activeTabs.activeLeaf
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
  const type = (path.match(RE_TYPE) ?? [])[1]
  if (!type) throw Error(`View "${type}" has not registered.`)
  return createLeaf({
    type,
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

/**
 * Split the parent {@link WorkspaceTabs} of the {@link Workspace.activeLeaf}
 */
function split(direction: Direction, path?: string) {
  const workspace = useService('workspace')
  const previousTabs = workspace.activeLeaf?.closest('tabs')
  const parentSplit = previousTabs?.closest('split') as WorkspaceSplit
  if (parentSplit.direction === direction)
    parentSplit.appendChild(createTabs(path))
  else {
    const newSplit = useService('workspace-split', [direction])
    parentSplit.replaceChild(previousTabs, newSplit)
    newSplit.appendChild(previousTabs)
    newSplit.appendChild(createTabs(path))
  }
}

// ---------- workspace.rightSplit ----------

export function ensureRightSidedockLeaf(uri: string) {
  const workspace = useService('workspace')
  const type = (uri.match(RE_TYPE) ?? [])[1]
  const existing = workspace.rightSplit.findLeaf(leaf => leaf.type === type)
  if (existing) return

  const tabs = useService('workspace-tabs')
  const leaf = createCustomLeaf(uri)

  tabs.appendChild(leaf)
  workspace.rightSplit.appendChild(tabs)
}

// ---------- workspace.floatingSplit ----------

export function openFloatingLeaf(arg0: string | WorkspaceLeaf) {
  const workspace = useService('workspace')
  const tabs = useService('workspace-tabs')
  const leaf = typeof arg0 === 'string' ? createCustomLeaf(arg0) : arg0

  tabs.appendChild(leaf)
  workspace.floatingSplit.appendChild(tabs)
}
