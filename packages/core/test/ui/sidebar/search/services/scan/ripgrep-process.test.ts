/**
 * Ripgrep child-process lifecycle: run generations, settlement, cancellation.
 */

import { EventEmitter } from 'node:events'
import { RipgrepProcessManager } from 'src/ui/sidebar/search/services/scan/ripgrep-process'
import { describe, expect, it, vi } from 'vitest'


class FakeStream extends EventEmitter {
  setEncoding(): void { }
}

class FakeChildProcess extends EventEmitter {
  stdout = new FakeStream()
  stderr = new FakeStream()
  killed = false
  kill(): void { this.killed = true }
}

function createTestEnv(throwOnSpawn = false) {
  const spawned: FakeChildProcess[] = []
  const spawnCalls: Array<{ cmd: string; args: string[]; opts: any }> = []
  const childProcess = {
    spawn: (cmd: string, args: string[], opts: any) => {
      spawnCalls.push({ cmd, args, opts })
      if (throwOnSpawn) throw new Error('spawn failed')
      const proc = new FakeChildProcess()
      spawned.push(proc)
      return proc
    },
  } as unknown as typeof import('child_process')

  return { spawned, spawnCalls, manager: new RipgrepProcessManager(() => childProcess) }
}

describe('beginTextRun()', () => {

  it('spawns with piped stdio and utf8 encoding', () => {
    const { spawned, spawnCalls, manager } = createTestEnv()
    const run = manager.beginTextRun(() => { })
    run.spawn('rg.exe', ['--json'], '/vault')

    expect(spawnCalls[0].cmd).toBe('rg.exe')
    expect(spawnCalls[0].args).toEqual(['--json'])
    expect(spawnCalls[0].opts).toEqual({ cwd: '/vault', stdio: ["ignore", "pipe", "pipe"] })
    expect(spawned[0]).toBeInstanceOf(FakeChildProcess)
  })

  it('calls onAllSettled once every tracked process of the run has closed', () => {
    const { spawned, manager } = createTestEnv()
    const settled = vi.fn()
    const run = manager.beginTextRun(settled)
    run.track(run.spawn('rg', [], '/vault'))
    run.track(run.spawn('rg', [], '/vault'))

    spawned[0].emit('close', 0)
    expect(settled).not.toHaveBeenCalled()
    spawned[1].emit('close', 0)
    expect(settled).toHaveBeenCalledTimes(1)
  })

  it('settles idempotently when both close and error fire', () => {
    const { spawned, manager } = createTestEnv()
    const settled = vi.fn()
    const run = manager.beginTextRun(settled)
    run.track(run.spawn('rg', [], '/vault'))

    spawned[0].emit('close', 0)
    spawned[0].emit('error', new Error('boom'))
    expect(settled).toHaveBeenCalledTimes(1)
  })

  it('ignores settlements of a superseded run and kills its processes', () => {
    const { manager } = createTestEnv()
    const settled1 = vi.fn()
    const settled2 = vi.fn()

    const run1 = manager.beginTextRun(settled1)
    const p1 = run1.track(run1.spawn('rg', [], '/vault'))

    const run2 = manager.beginTextRun(settled2)
    expect(p1.killed).toBe(true)

    p1.emit('close', null)
    expect(settled1).not.toHaveBeenCalled()

    const p2 = run2.track(run2.spawn('rg', [], '/vault'))
    p2.emit('close', 0)
    expect(settled2).toHaveBeenCalledTimes(1)
  })

  it('never fires onAllSettled when the run spawns no tasks', () => {
    const { manager } = createTestEnv()
    const settled = vi.fn()
    manager.beginTextRun(settled)
    expect(settled).not.toHaveBeenCalled()
  })
})

describe('cancelAll()', () => {

  it('kills text and negation processes and silences the old run', async () => {
    const { spawned, manager } = createTestEnv()
    const settled = vi.fn()
    const run = manager.beginTextRun(settled)
    const textProc = run.track(run.spawn('rg', [], '/vault'))

    const scan = manager.scanFilesWithMatches('rg', ['-l'], '/vault')
    const negationProc = spawned[1]

    manager.cancelAll()
    expect(textProc.killed).toBe(true)
    expect(negationProc.killed).toBe(true)

    textProc.emit('close', 0)
    expect(settled).not.toHaveBeenCalled()

    negationProc.stdout.emit('data', 'a.md\n')
    negationProc.emit('close', 0)
    await expect(scan).resolves.toEqual({ ok: true, paths: ['a.md'] })
  })
})

describe('scanFilesWithMatches()', () => {

  it('collects trimmed printed paths on a clean exit', async () => {
    const { spawned, manager } = createTestEnv()
    const scan = manager.scanFilesWithMatches('rg', ['-l', '-e', 'foo'], '/vault')

    spawned[0].stdout.emit('data', 'a.md\n  sub/b .md \n\n')
    spawned[0].emit('close', 0)
    await expect(scan).resolves.toEqual({ ok: true, paths: ['a.md', 'sub/b .md'] })
  })

  it('treats exit code 1 (nothing matched) as a successful empty result', async () => {
    const { spawned, manager } = createTestEnv()
    const scan = manager.scanFilesWithMatches('rg', ['-l'], '/vault')

    spawned[0].emit('close', 1)
    await expect(scan).resolves.toEqual({ ok: true, paths: [] })
  })

  it('reports failure on abnormal exit codes', async () => {
    const { spawned, manager } = createTestEnv()
    const scan = manager.scanFilesWithMatches('rg', ['-l'], '/vault')

    spawned[0].stdout.emit('data', 'a.md\n')
    spawned[0].emit('close', 2)
    await expect(scan).resolves.toEqual({ ok: false, paths: [] })
  })

  it('reports failure when spawn throws', async () => {
    const { manager } = createTestEnv(true)
    await expect(manager.scanFilesWithMatches('rg', ['-l'], '/vault'))
      .resolves.toEqual({ ok: false, paths: [] })
  })

  it('resolves once when error and close both fire', async () => {
    const { spawned, manager } = createTestEnv()
    const scan = manager.scanFilesWithMatches('rg', ['-l'], '/vault')

    spawned[0].emit('close', 0)
    spawned[0].emit('error', new Error('boom'))
    await expect(scan).resolves.toEqual({ ok: true, paths: [] })
  })
})
