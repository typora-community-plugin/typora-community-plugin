import { editor, File } from 'typora'


export interface QuickOpenSyncHandlers {
  /** A file was added to the native Quick Open cache. */
  onFileAdded(filePath: string): void
  /** A file or folder was removed from the native Quick Open cache. */
  onPathRemoved(prefix: string): void
}

/**
 * Wrap the native Quick Open worker so the files it adds or removes (e.g. new
 * files) are mirrored via `handlers`.
 *
 * Only the mirrored cache is affected; every message is still forwarded to the
 * original handler, so the native panel is not affected.
 *
 * @returns the wrapped worker, or `undefined` when unavailable / already wrapped.
 */
export function interceptQuickOpenWorker(
  handlers: QuickOpenSyncHandlers,
  isAlreadyWrapped?: (worker: Worker) => boolean,
): Worker | undefined {
  if (!File.isNode) return undefined

  const worker = (editor.quickOpenPanel as any)?.worker as Worker | undefined
  if (!worker || isAlreadyWrapped?.(worker)) return undefined

  const original = worker.onmessage
  worker.onmessage = (event: MessageEvent) => {
    switch (event.data?.type) {
      case 'addInitFiles': {
        const [filePaths] = event.data.detail as [string[]]
        for (const filePath of filePaths) handlers.onFileAdded(filePath)
        break
      }
      case 'removeInitFiles': {
        const [prefix] = event.data.detail as [string]
        if (prefix) handlers.onPathRemoved(prefix)
        break
      }
    }
    original?.call(worker, event)
  }

  return worker
}
