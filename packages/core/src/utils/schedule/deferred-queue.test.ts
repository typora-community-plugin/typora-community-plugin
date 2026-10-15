import { jest } from '@jest/globals'
import { DeferredQueue } from './deferred-queue'


describe('DeferredQueue', () => {

  it('runs tasks immediately when not deferring', async () => {
    const queue = new DeferredQueue()
    const task = jest.fn(async () => { })

    await queue.run(task)

    expect(task).toHaveBeenCalledTimes(1)
  })

  it('defer() returns false and does nothing when not deferring', () => {
    const queue = new DeferredQueue()
    const task = jest.fn()

    expect(queue.defer(task)).toBe(false)
    expect(task).not.toHaveBeenCalled()
  })

  it('queues asynchronous tasks until end() when deferring', async () => {
    const queue = new DeferredQueue()
    const task = jest.fn(async () => { })
    queue.begin()

    const done = queue.run(task)
    expect(task).not.toHaveBeenCalled()

    await queue.end()
    await done
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('queues synchronous tasks and reports them as deferred', async () => {
    const queue = new DeferredQueue()
    const task = jest.fn()
    queue.begin()

    expect(queue.defer(task)).toBe(true)
    expect(task).not.toHaveBeenCalled()

    await queue.end()
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('drains queued tasks in FIFO order', async () => {
    const queue = new DeferredQueue()
    const order: number[] = []
    queue.begin()
    queue.defer(() => order.push(1))
    queue.defer(() => order.push(2))

    await queue.end()

    expect(order).toEqual([1, 2])
  })

  it('keeps draining other tasks when one throws', async () => {
    const queue = new DeferredQueue()
    const ok = jest.fn()
    queue.begin()
    queue.run(async () => { throw new Error('boom') }).catch(() => { })
    queue.defer(ok)

    await queue.end()

    expect(ok).toHaveBeenCalledTimes(1)
  })
})
