import { jest } from '@jest/globals'
import 'src/setup-test-env'
import { FileAdapter, ListFilesOptions } from './file-adapter'
import type { FileStats } from './file-adapter'

class TestFileAdapter extends FileAdapter {
  mockList = jest.fn().mockResolvedValue([] as string[])
  mockIsDir = jest.fn().mockResolvedValue(false)
  mockAccess = jest.fn().mockResolvedValue(undefined)
  mockExists = jest.fn().mockResolvedValue(true)
  mockStat = jest.fn()
  mockMkdir = jest.fn()
  mockCopy = jest.fn()
  mockMove = jest.fn()
  mockReadText = jest.fn()
  mockReadTextSync = jest.fn()
  mockWriteText = jest.fn()
  mockAppendText = jest.fn()
  mockRemove = jest.fn()
  mockTrash = jest.fn()

  async access(filepath: string) { return this.mockAccess(filepath) }
  async exists(filepath: string) { return this.mockExists(filepath) }
  async stat(filepath: string) { return this.mockStat(filepath) }
  isDirectory(filepath: string) { return this.mockIsDir(filepath) }
  async mkdir(dirpath: string) { return this.mockMkdir(dirpath) }
  async copy(src: string, dest: string) { return this.mockCopy(src, dest) }
  async move(src: string, dest: string) { return this.mockMove(src, dest) }
  list(dirpath: string) { return this.mockList(dirpath) }
  readText(filepath: string) { return this.mockReadText(filepath) }
  readTextSync(filepath: string) { return this.mockReadTextSync(filepath) }
  async writeText(filepath: string, text: string) { return this.mockWriteText(filepath, text) }
  async appendText(filepath: string, text: string) { return this.mockAppendText(filepath, text) }
  async remove(filepath: string) { return this.mockRemove(filepath) }
  async trash(filepath: string) { return this.mockTrash(filepath) }
}


describe('FileAdapter', () => {

  describe('listFiles()', () => {

    it('should return only files (not directories)', async () => {
      const adapter = new TestFileAdapter()
      adapter.mockList.mockResolvedValue(['file1.txt', 'subdir', 'file2.md'])
      adapter.mockIsDir.mockImplementation(async (p: string) => p.includes('subdir'))

      const result = await adapter.listFiles('/vault')

      expect(result).toContain('/vault/file1.txt')
      expect(result).toContain('/vault/file2.md')
      expect(result.length).toBe(2)
    })

    it('should return empty array when directory is empty', async () => {
      const adapter = new TestFileAdapter()
      adapter.mockList.mockResolvedValue([])

      const result = await adapter.listFiles('/vault')

      expect(result).toEqual([])
    })

    it('should collect files with spaces and special chars in names', async () => {
      const adapter = new TestFileAdapter()
      adapter.mockList.mockResolvedValue(['my file.md', 'another-file.md'])
      adapter.mockIsDir.mockResolvedValue(false)

      const result = await adapter.listFiles('/vault')

      expect(result).toEqual(['/vault/my file.md', '/vault/another-file.md'])
    })

    it('should recurse into subdirectories when recursive=true', async () => {
      const adapter = new TestFileAdapter()
      adapter.mockList.mockImplementation(async (p: string) => {
        if (p === '/vault') return ['subdir', 'root.txt']
        if (p === '/vault/subdir') return ['nested.md']
        return []
      })
      adapter.mockIsDir.mockResolvedValue(false)
      // Override isDirectory for subdir path to make it be treated as directory
      const originalIsDir = adapter.isDirectory.bind(adapter)
      adapter.mockIsDir.mockImplementation(async (p: string) => {
        return p === '/vault/subdir' || p.endsWith('\\subdir')
      })

      const result = await adapter.listFiles('/vault', { recursive: true })

      expect(result).toContain('/vault/subdir/nested.md')
      expect(result).toContain('/vault/root.txt')
    })

    it('should not recurse when recursive=false (default)', async () => {
      const adapter = new TestFileAdapter()
      adapter.mockList.mockResolvedValue(['subdir', 'root.txt'])
      adapter.mockIsDir.mockImplementation(async (p: string) => p.endsWith('subdir'))

      const result = await adapter.listFiles('/vault')

      expect(result).toEqual(['/vault/root.txt'])
    })

    it('should collect multiple levels of nested directories with recursive=true', async () => {
      const adapter = new TestFileAdapter()

      // Simple helper to normalize paths for comparison on any OS
      const nameOf = (p: string) => p.replace(/\\/g, '/').split('/').filter(Boolean).pop()!

      adapter.mockList.mockImplementation(async (pathArg: string) => {
        switch (nameOf(pathArg)) {
          case 'vault': return ['a', 'b']
          case 'a': return ['file-a.txt', 'deep']
          case 'deep': return ['leaf.md']
          case 'b': return ['file-b.txt']
          default: return []
        }
      })

      adapter.mockIsDir.mockImplementation(async (pathArg: string) => {
        return ['a', 'b', 'deep'].includes(nameOf(pathArg))
      })

      const result = await adapter.listFiles('/vault', { recursive: true })

      expect(result).toContain('/vault/b/file-b.txt')
    })

    it('should respect AbortSignal abort before processing', async () => {
      const controller = new AbortController()
      const adapter = new TestFileAdapter()
      controller.abort()

      const promise = adapter.listFiles('/vault', { recursive: true, signal: controller.signal })

      await expect(promise).rejects.toThrow('The operation was aborted')
    })

    it('should respect AbortSignal abort during processing', async () => {
      const controller = new AbortController()
      const adapter = new TestFileAdapter()

      let shouldAbort = false
      adapter.mockIsDir.mockImplementation(async (p: string) => {
        if (shouldAbort) {
          controller.abort()
        }
        return !p.endsWith('file.md')
      })
      adapter.mockList.mockImplementation(async (p: string) => {
        if (!shouldAbort) {
          shouldAbort = true
          return ['file.md', 'next-file.txt']
        }
        throw new DOMException('The operation was aborted.', 'AbortError')
      })

      const promise = adapter.listFiles('/vault', { signal: controller.signal })

      await expect(promise).rejects.toThrow()
    })

    it('should use path.join to construct file paths', async () => {
      const adapter = new TestFileAdapter()
      adapter.mockList.mockResolvedValue(['file.txt'])
      adapter.mockIsDir.mockResolvedValue(false)

      const result = await adapter.listFiles('/vault/subdir/', { recursive: true })

      expect(result).toEqual(['/vault/subdir/file.txt'])
    })


    describe('signal throwIfAborted calls', () => {

      it('should call signal.throwIfAborted at the start of listFiles', async () => {
        const controller = new AbortController()
        controller.abort()
        const adapter = new TestFileAdapter()

        await expect(adapter.listFiles('/vault', { signal: controller.signal }))
          .rejects.toThrow()
      })

      it('should call signal.throwIfAborted after each file name iteration', async () => {
        const adapter = new TestFileAdapter()

        let aborted = false
        const mockSignal = {
          get aborted() { return aborted },
          throwIfAborted: () => {
            if (aborted) throw new DOMException('The operation was aborted.', 'AbortError')
          }
        } as AbortSignal

        adapter.mockList.mockResolvedValue(['a.txt', 'b.md'])
        adapter.mockIsDir.mockImplementation(async () => {
          if (!aborted) {
            aborted = true
            mockSignal.throwIfAborted()
          }
          return false
        })

        await expect(adapter.listFiles('/vault', { signal: mockSignal }))
          .rejects.toThrow('The operation was aborted.')
      })
    })
  })

  describe('abstract method signatures', () => {

    it('should have all required abstract methods available on instances', async () => {
      const adapter = new TestFileAdapter()

      await adapter.access('/test/file.txt')
      await adapter.exists('/test/file.txt')
      await adapter.stat('/test/file.txt')
      await adapter.isDirectory('/test/dir')
      await adapter.mkdir('/test/dir')
      await adapter.copy('/src', '/dest')
      await adapter.move('/src', '/dest')
      await adapter.list('/test/dir')
      await adapter.readText('/test/file.txt')
      adapter.readTextSync('/test/file.txt')
      await adapter.writeText('/test/file.txt', 'content')
      await adapter.appendText('/test/file.txt', 'extra')
      await adapter.remove('/test/file.txt')
      await adapter.trash('/test/file.txt')

      expect(adapter.mockAccess).toHaveBeenCalledWith('/test/file.txt')
      expect(adapter.mockExists).toHaveBeenCalledWith('/test/file.txt')
    })

    it('should support the ListFilesOptions type with recursive flag', async () => {
      const adapter = new TestFileAdapter()
      adapter.mockList.mockResolvedValue(['f.md'])
      adapter.mockIsDir.mockResolvedValue(false)

      // Should accept { recursive: true/false } without error
      await expect(adapter.listFiles('/vault', { recursive: false })).resolves.not.toThrow()
      await expect(adapter.listFiles('/vault', { recursive: true })).resolves.not.toThrow()
    })
  })
})
