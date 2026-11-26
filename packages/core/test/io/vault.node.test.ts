import { vi } from 'vitest'
import 'src/setup-test-env'


const fsMock = {
  isDirectory: vi.fn(),
  isFile: vi.fn(),
}

vi.doMock('src/io/fs/filesystem', () => ({ default: fsMock }))


const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

function installGlobals() {
  const bridge = {
    invoke: vi.fn().mockResolvedValue(undefined),
    callHandler: vi.fn(),
  }
  const onChangeForWin = vi.fn()
  const onRemoveFile = vi.fn()

  ;(globalThis as any).File = {
    isNode: true,
    getMountFolder: () => '/vault',
    setMountFolder: () => { },
  }
  ;(globalThis as any)._options = {}
  ;(globalThis as any).JSBridge = bridge
  ;(globalThis as any).editor = {
    library: {
      fileTree: { onChangeForWin, onRemoveFile },
    },
  }

  return { bridge, onChangeForWin }
}

async function createVault() {
  const globals = installGlobals()
  const { Vault } = await import('src/io/vault')
  const vault = new Vault({ once: vi.fn() } as any)

  // Read the decorated handler from the object: calling the original mock
  // returned by `installGlobals` would bypass the decorator.
  return { vault, fileTree: (globalThis as any).editor.library.fileTree, ...globals }
}


describe('Vault on Node (Windows/Linux)', () => {
  const disposers: Array<() => void> = []

  afterEach(() => {
    disposers.splice(0).forEach(dispose => dispose())
    vi.clearAllMocks()
    delete (globalThis as any).File
    delete (globalThis as any)._options
    delete (globalThis as any).JSBridge
    delete (globalThis as any).editor
  })

  function listen(vault: any, event: string) {
    const listener = vi.fn()
    disposers.push(vault.on(event, listener))
    return listener
  }

  it('emits file:create for a new file reported by the file tree', async () => {
    fsMock.isFile.mockResolvedValue(true)
    const { vault, fileTree } = await createVault()
    const created = listen(vault, 'file:create')

    fileTree.onChangeForWin('/vault/new.md', [])
    await flush()

    expect(created).toHaveBeenCalledTimes(1)
    expect(created).toHaveBeenCalledWith('/vault/new.md')
  })

  it('ignores directories and content changes', async () => {
    fsMock.isFile.mockResolvedValue(false)
    const { vault, fileTree } = await createVault()
    const created = listen(vault, 'file:create')

    fileTree.onChangeForWin('/vault/new-folder', [])
    await flush()

    fsMock.isFile.mockResolvedValue(true)
    fileTree.onChangeForWin('/vault/changed.md', [], 'change')
    fileTree.onChangeForWin('/vault/removed.md', [], 'unlink')
    await flush()

    expect(created).not.toHaveBeenCalled()
  })

})
