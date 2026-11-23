/**
 * Platform/path helpers of the ripgrep search backend.
 */


import {
  isNativeBridgePlatform,
  resolveRipgrepPath,
  toAbsolutePath,
} from 'src/ui/sidebar/search/services/scan/rg-platform'
import { afterEach, describe, expect, it, vi } from 'vitest'


const savedReqnode = (globalThis as any).reqnode

afterEach(() => {
  ;(globalThis as any).reqnode = savedReqnode
})

describe('isNativeBridgePlatform', () => {

  it('is true only on darwin', () => {
    expect(isNativeBridgePlatform()).toBe(process.platform === 'darwin')
  })
})

describe('resolveRipgrepPath', () => {

  it('fixes asar-packaged paths', () => {
    ;(globalThis as any).reqnode = () => ({
      rgPath: 'C:/app/node_modules.asar/vscode-ripgrep/bin/rg.exe',
    })
    expect(resolveRipgrepPath())
      .toBe('C:/app/node_modules/vscode-ripgrep/bin/rg.exe')
  })

  it('keeps plain node_modules paths untouched', () => {
    ;(globalThis as any).reqnode = () => ({ rgPath: '/usr/bin/rg' })
    expect(resolveRipgrepPath()).toBe('/usr/bin/rg')
  })

  it('returns null when the module is missing, empty, or throws', () => {
    ;(globalThis as any).reqnode = (): undefined => undefined
    expect(resolveRipgrepPath()).toBeNull()

    ;(globalThis as any).reqnode = () => ({ rgPath: '' })
    expect(resolveRipgrepPath()).toBeNull()

    ;(globalThis as any).reqnode = () => { throw new Error('no node') }
    expect(resolveRipgrepPath()).toBeNull()
  })

  it('returns null when reqnode itself is unavailable', () => {
    delete (globalThis as any).reqnode
    expect(resolveRipgrepPath()).toBeNull()
  })
})

describe('toAbsolutePath', () => {

  it('joins ripgrep-printed relative paths onto the cwd', () => {
    expect(toAbsolutePath('/vault', 'sub/a.md')).toBe('/vault/sub/a.md')
  })

  it('keeps already-absolute paths untouched', () => {
    expect(toAbsolutePath('/vault', '/other/a.md')).toBe('/other/a.md')
  })
})
