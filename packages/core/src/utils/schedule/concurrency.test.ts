import { runConcurrent } from './concurrency'


describe('runConcurrent', () => {

  it('runs the worker over every item exactly once', async () => {
    const items = [1, 2, 3, 4, 5]
    const seen: number[] = []

    await runConcurrent(items, 2, async item => { seen.push(item) })

    expect(seen.sort()).toEqual(items)
  })

  it('does not mutate the input array', async () => {
    const items = [1, 2, 3]

    await runConcurrent(items, 2, async () => { })

    expect(items).toEqual([1, 2, 3])
  })

  it('limits the number of concurrent workers', async () => {
    let active = 0
    let max = 0

    await runConcurrent([1, 2, 3, 4, 5], 2, async () => {
      active++
      max = Math.max(max, active)
      await new Promise(resolve => setTimeout(resolve, 5))
      active--
    })

    expect(max).toBeLessThanOrEqual(2)
    expect(max).toBe(2)
  })

  it('reports progress once per completed item', async () => {
    const completed: number[] = []

    await runConcurrent([1, 2, 3], 1, async () => { }, {
      onProgress: (done, total) => {
        completed.push(done)
        expect(total).toBe(3)
      },
    })

    expect(completed).toEqual([1, 2, 3])
  })

  it('throws when the signal is aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      runConcurrent([1, 2, 3], 2, async () => { }, { signal: controller.signal }),
    ).rejects.toThrow()
  })
})
