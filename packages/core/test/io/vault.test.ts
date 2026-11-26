import { vi } from 'vitest'
import 'src/setup-test-env'
import { resolveVaultPath, Vault } from 'src/io/vault'


function setTyporaGlobals(
  file: { getMountFolder?: () => string, isNode?: boolean, isWin?: boolean, filePath?: string, bundle?: { filePath?: string } },
  options: { mountFolder?: string, initFilePath?: string },
) {
  ;(globalThis as any).File = file
  ;(globalThis as any)._options = options
}


describe('resolveVaultPath', () => {

  afterEach(() => {
    delete (globalThis as any).File
    delete (globalThis as any)._options
  })

  it('uses the mounted folder', () => {
    setTyporaGlobals(
      { getMountFolder: () => '/vault', filePath: '/home/user/notes/a.md' },
      { mountFolder: '/options-vault', initFilePath: '/home/user/notes/b.md' })

    expect(resolveVaultPath()).toBe('/vault')
  })

  it('falls back to the mount folder from options', () => {
    setTyporaGlobals(
      { getMountFolder: () => '', filePath: '/home/user/notes/a.md' },
      { mountFolder: '/options-vault', initFilePath: '' })

    expect(resolveVaultPath()).toBe('/options-vault')
  })

  it('falls back to the directory of the opened file', () => {
    setTyporaGlobals(
      { getMountFolder: () => '', filePath: '/home/user/notes/a.md', bundle: { filePath: '/home/user/notes/b.md' } },
      { mountFolder: '', initFilePath: '' })

    expect(resolveVaultPath()).toBe('/home/user/notes')
  })

  it('falls back to the init file path before the opened file', () => {
    setTyporaGlobals(
      { getMountFolder: () => '', filePath: '/home/user/notes/a.md' },
      { mountFolder: '', initFilePath: '/home/user/work/b.md' })

    expect(resolveVaultPath()).toBe('/home/user/work')
  })

  it('returns an empty string when no folder and no file are opened', () => {
    setTyporaGlobals(
      { getMountFolder: () => '', filePath: '', bundle: { filePath: '' } },
      { mountFolder: '', initFilePath: '' })

    // `path.dirname('')` would be `.` (or `/` on macOS), which must never be
    // treated as a vault.
    expect(resolveVaultPath()).toBe('')
  })

  it('returns an empty string when Typora reports nothing at all', () => {
    setTyporaGlobals(
      { getMountFolder: () => undefined },
      {})

    expect(resolveVaultPath()).toBe('')
  })
})


describe('Vault on macOS', () => {

  afterEach(() => {
    delete (globalThis as any).File
    delete (globalThis as any)._options
    delete (globalThis as any).editor
  })

  function createVault(onFileChanges: (events: any[]) => void) {
    ;(globalThis as any).File = {
      isNode: false,
      getMountFolder: () => '/vault',
      setMountFolder: () => { },
    }
    ;(globalThis as any)._options = {}
    ;(globalThis as any).editor = { library: { onFileChanges } }

    return new Vault({ once: vi.fn() } as any)
  }

  it('emits file:create for created files but not created folders', () => {
    const onFileChanges = vi.fn()
    const vault = createVault(onFileChanges)
    const created = vi.fn()
    vault.on('file:create', created)

    // The constructor decorates the native handler, so call the decorated one.
    ;(globalThis as any).editor.library.onFileChanges([
      { type: 'created', path: '/vault/new.md', isDir: false },
      { type: 'created', path: '/vault/new-folder', isDir: true },
    ])

    expect(created).toHaveBeenCalledTimes(1)
    expect(created).toHaveBeenCalledWith('/vault/new.md')
  })
})
