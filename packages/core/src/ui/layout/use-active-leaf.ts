import { useEventBus } from "src/common/eventbus"
import { useService } from "src/common/service"
import type { WorkspaceLeaf } from "./workspace-leaf"
import type { WorkspaceParent } from "./workspace-parent"
import { memorize } from "src/utils"

/**
 * @example const [getActiveLeaf, setActiveLeaf] = useActiveLeaf()
 */
const useActiveLeaf = memorize(function () {
  let _activeLeaf: WorkspaceLeaf

  function getActiveLeaf(rootSplit = useService('workspace-root')): WorkspaceLeaf {
    if (!_activeLeaf?.parent) {
      setActiveLeaf((rootSplit.children[0] as WorkspaceParent)?.children[0] as WorkspaceLeaf)
    }
    return _activeLeaf
  }

  function setActiveLeaf(
    leaf: WorkspaceLeaf,
    rootSplit = useEventBus('workspace-root'),
    workspace = useEventBus('workspace'),
  ) {
    if (_activeLeaf === leaf) return

    _activeLeaf && rootSplit.emit('leaf:will-deactive', _activeLeaf)
    _activeLeaf?.parent?.containerEl.classList.remove('mod-active')

    _activeLeaf = leaf

    leaf?.parent?.containerEl.classList.add('mod-active')
    leaf && rootSplit.emit('leaf:active', leaf)
    leaf && workspace.emit('active-leaf:change', leaf)
  }

  return [getActiveLeaf, setActiveLeaf] as const
})

export { useActiveLeaf }
