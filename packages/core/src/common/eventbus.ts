import type { AppEvents } from "src/app"
import type { ConfigEvents } from "src/io/config-repository"
import type { VaultEvents } from "src/io/vault"
import type { WorkspaceEvents } from "src/ui/workspace"
import type { WorkspaceRootEvents } from "src/ui/layout/workspace-root"
import type { MarkdownEditorEvents } from "src/ui/editor/markdown-editor"
import { memorize } from "src/utils"
import { PublicEvents } from "./events"


type EventbusMap = {
  'app': AppEvents
  'config-repository': ConfigEvents
  'vault': VaultEvents
  'workspace': WorkspaceEvents
  'workspace-root': WorkspaceRootEvents
  'markdown-editor': MarkdownEditorEvents
}

export const useEventBus = memorize(
  function <T extends keyof EventbusMap>(scope: T) {
    return new PublicEvents<EventbusMap[T]>(scope)
  }
)
