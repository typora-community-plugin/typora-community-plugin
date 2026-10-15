import { editor, File } from 'typora'
import type { MetadataManager } from 'src/metadata/metadata-manager'


/** Workers already wrapped by {@link interceptQuickOpenWorker}. */
const wrappedWorkers = new WeakSet<Worker>()

/**
 * Wrap the native Quick Open worker so the files it adds or removes (e.g. new
 * files) are mirrored into the metadata cache.
 *
 * Only the mirrored cache is affected; every message is still forwarded to the
 * original handler, so the native panel is not affected.
 *
 * @returns the wrapped worker, or `undefined` when unavailable / already wrapped.
 */
export function interceptQuickOpenWorker(metadata: MetadataManager): Worker | undefined {
  if (!File.isNode) return undefined

  const worker = (editor.quickOpenPanel as any)?.worker as Worker | undefined
  if (!worker || wrappedWorkers.has(worker)) return undefined
  wrappedWorkers.add(worker)

  const original = worker.onmessage
  worker.onmessage = (event: MessageEvent) => {
    switch (event.data?.type) {
      case 'addInitFiles': {
        const [filePaths] = event.data.detail as [string[]]
        for (const filePath of filePaths) metadata.update(filePath).catch(() => { })
        break
      }
      case 'removeInitFiles': {
        const [prefix] = event.data.detail as [string]
        if (prefix) metadata.remove(prefix)
        break
      }
    }
    original?.call(worker, event)
  }

  return worker
}
