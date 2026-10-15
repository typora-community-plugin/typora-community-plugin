import { Semaphore } from './semaphore'


const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(r => { resolve = r })
  return { promise, resolve }
}


describe('Semaphore', () => {

  it('runs up to `limit` tasks concurrently', async () => {
    const semaphore = new Semaphore(2)
    let active = 0
    let max = 0
    const gate = deferred()

    const task = () => semaphore.run(async () => {
      active++
      max = Math.max(max, active)
      await gate.promise
      active--
    })

    const all = [task(), task(), task()]
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(max).toBe(2)

    gate.resolve()
    await Promise.all(all)
    expect(max).toBe(2)
  })

  it('never exceeds the limit when slots are handed over', async () => {
    const semaphore = new Semaphore(1)
    let active = 0
    let max = 0

    await Promise.all([1, 2, 3].map(() => semaphore.run(async () => {
      active++
      max = Math.max(max, active)
      await Promise.resolve()
      active--
    })))

    expect(max).toBe(1)
  })

  it('releases the slot when the task throws', async () => {
    const semaphore = new Semaphore(1)

    await expect(semaphore.run(async () => { throw new Error('boom') }))
      .rejects.toThrow('boom')

    await expect(semaphore.run(async () => 'ok')).resolves.toBe('ok')
  })

  it('resolves with the task result', async () => {
    const semaphore = new Semaphore(1)

    await expect(semaphore.run(async () => 42)).resolves.toBe(42)
  })
})
