import { vi } from 'vitest'
import 'src/setup-test-env'
import { registerService } from 'src/common/service'
import { syncFileEvents } from 'src/metadata/sync/file-sync'


type Listener = (...args: any[]) => any

function registerServices() {
  const listeners: Record<string, Listener> = {}
  const disposers: ReturnType<typeof vi.fn>[] = []

  registerService('vault', () => ({
    on: (event: string, listener: Listener) => {
      listeners[event] = listener
      const dispose = vi.fn()
      disposers.push(dispose)
      return dispose
    },
  } as any))
  registerService('workspace', () => ({
    on: (event: string, listener: Listener) => {
      listeners[event] = listener
      const dispose = vi.fn()
      disposers.push(dispose)
      return dispose
    },
  } as any))
  registerService('markdown-editor', () => ({
    getMarkdown: vi.fn(() => '# content'),
  } as any))

  return { listeners, disposers }
}

function createMetadataMock() {
  return {
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn(),
    rename: vi.fn(),
  }
}


describe('syncFileEvents', () => {

  it('mirrors created files into the metadata cache', async () => {
    const { listeners } = registerServices()
    const metadata = createMetadataMock()

    syncFileEvents(metadata as any)

    await listeners['file:create']('/vault/new.md')

    expect(metadata.update).toHaveBeenCalledWith('/vault/new.md')
  })

  it('mirrors deleted and renamed files into the metadata cache', () => {
    const { listeners } = registerServices()
    const metadata = createMetadataMock()

    syncFileEvents(metadata as any)

    listeners['file:delete']('/vault/old.md')
    listeners['file:rename']('/vault/a.md', '/vault/b.md')
    listeners['directory:rename']('/vault/dir', '/vault/docs')

    expect(metadata.remove).toHaveBeenCalledWith('/vault/old.md')
    expect(metadata.rename).toHaveBeenCalledWith('/vault/a.md', '/vault/b.md')
    expect(metadata.rename).toHaveBeenCalledWith('/vault/dir', '/vault/docs')
  })

  it('disposes every listener', () => {
    const { disposers } = registerServices()

    const dispose = syncFileEvents(createMetadataMock() as any)
    dispose()

    expect(disposers).toHaveLength(5)
    for (const disposer of disposers) expect(disposer).toHaveBeenCalled()
  })
})
