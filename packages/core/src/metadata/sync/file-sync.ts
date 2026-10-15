import { useService } from 'src/common/service'
import type { MetadataManager } from 'src/metadata/metadata-manager'
import type { DisposeFunc } from 'src/utils/types'


/**
 * Mirror file-system changes into the metadata cache: vault deletes/renames and
 * editor saves (re-processed from unsaved editor content).
 *
 * @returns A dispose function that unsubscribes the listeners.
 */
export function syncFileEvents(metadata: MetadataManager): DisposeFunc {
  const vault = useService('vault')
  const workspace = useService('workspace')
  const markdownEditor = useService('markdown-editor')

  const disposers = [
    workspace.on('file:will-save', filePath =>
      metadata.update(filePath, markdownEditor.getMarkdown()).catch(() => { })),
    vault.on('file:delete', filePath => metadata.remove(filePath)),
    vault.on('file:rename', (oldPath, newPath) => metadata.rename(oldPath, newPath)),
    vault.on('directory:rename', (oldPath, newPath) => metadata.rename(oldPath, newPath)),
  ]

  return () => disposers.forEach(dispose => dispose())
}
