import type { AppEvents } from "src/app"
import type { ConfigEvents } from "src/io/config-repository"
import type { VaultEvents } from "src/io/vault"
import type { WorkspaceEvents } from "src/ui/workspace"
import type { MarkdownEditorEvents } from "src/ui/editor/markdown-editor"
import { memorize } from "src/utils"
import { Events } from "./events"


type EventbusMap = {
  'app': AppEvents
  'config-repository': ConfigEvents
  'vault': VaultEvents
  'workspace': WorkspaceEvents
  'markdown-editor': MarkdownEditorEvents
}

export const useEventBus = memorize(
  function <T extends keyof EventbusMap>(scope: T) {
    return new Events<EventbusMap[T]>(scope)
  }
)
