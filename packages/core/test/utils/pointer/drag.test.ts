import 'src/setup-test-env'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import type { DragInfo, DragOptions } from 'src/utils/pointer/drag'
import { beginDrag } from 'src/utils/pointer/drag'


function fire(type: string, options: Record<string, any> = {}) {
  document.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...options }))
}

function mousedown(clientX: number, clientY: number, button = 0) {
  return new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX, clientY, button })
}

function makeOptions(overrides: Partial<DragOptions> = {}) {
  const onMove = jest.fn()
  const onEnd = jest.fn()
  return { onMove, onEnd, options: { onMove, onEnd, ...overrides } }
}

describe('beginDrag', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    // make sure leaked sessions from a failing test do not pollute the next one
    fire('pointerup', { button: 0, clientX: 0, clientY: 0 })
  })

  test('ignores non-left-button mousedown', () => {
    const { onMove, onEnd, options } = makeOptions()
    beginDrag(mousedown(10, 10, 2), options)

    fire('pointermove', { clientX: 50, clientY: 50 })
    fire('pointerup', { button: 2 })

    expect(onMove).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()
  })

  test('calls onMove with deltas from the start position', () => {
    const { onMove, options } = makeOptions()
    beginDrag(mousedown(100, 100), options)

    fire('pointermove', { clientX: 120, clientY: 90 })

    expect(onMove).toHaveBeenCalledTimes(1)
    const [, info] = onMove.mock.lastCall as [PointerEvent, DragInfo]
    expect(info).toMatchObject({ startX: 100, startY: 100, x: 120, y: 90, dx: 20, dy: -10, moved: true })
  })

  test('ends on pointerup and calls onEnd once', () => {
    const { onMove, onEnd, options } = makeOptions()
    beginDrag(mousedown(0, 0), options)

    fire('pointermove', { clientX: 5, clientY: 5 })
    fire('pointerup', { button: 0 })
    fire('pointerup', { button: 0 })
    fire('pointermove', { clientX: 10, clientY: 10 })

    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd.mock.lastCall[2]).toBe(false) // not canceled
  })

  test('pointerup of a secondary button does not end the session', () => {
    const { onMove, onEnd, options } = makeOptions()
    beginDrag(mousedown(0, 0), options)

    fire('pointerup', { button: 2 })
    fire('pointermove', { clientX: 10, clientY: 10 })

    expect(onEnd).not.toHaveBeenCalled()
    expect(onMove).toHaveBeenCalledTimes(1)
  })

  test('threshold suppresses onMove until exceeded', () => {
    const { onMove, options } = makeOptions({ threshold: 9 })
    beginDrag(mousedown(0, 0), options)

    fire('pointermove', { clientX: 5, clientY: 5 })
    expect(onMove).not.toHaveBeenCalled()

    fire('pointermove', { clientX: 12, clientY: 0 })
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove.mock.lastCall[1].moved).toBe(true)
  })

  test('onEnd reports moved=false when released below threshold (plain click)', () => {
    const { onMove, onEnd, options } = makeOptions({ threshold: 9 })
    beginDrag(mousedown(0, 0), options)

    fire('pointermove', { clientX: 3, clientY: 3 })
    fire('pointerup', { button: 0 })

    expect(onMove).not.toHaveBeenCalled()
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd.mock.lastCall[1].moved).toBe(false)
  })

  test('onMove returning false ends the session as canceled', () => {
    const onMove = jest.fn().mockReturnValue(false)
    const { onEnd, options } = makeOptions({ onMove })
    beginDrag(mousedown(0, 0), options)

    fire('pointermove', { clientX: 10, clientY: 0 })
    fire('pointermove', { clientX: 20, clientY: 0 })
    fire('pointerup', { button: 0 })

    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd.mock.lastCall[2]).toBe(true) // canceled
  })

  test('pointercancel ends the session as canceled', () => {
    const { onEnd, options } = makeOptions()
    beginDrag(mousedown(0, 0), options)

    fire('pointercancel')
    fire('pointerup', { button: 0 })

    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd.mock.lastCall[2]).toBe(true)
  })

  test('works without onEnd', () => {
    const onMove = jest.fn()
    beginDrag(mousedown(0, 0), { onMove })

    fire('pointermove', { clientX: 1, clientY: 1 })
    expect(() => fire('pointerup', { button: 0 })).not.toThrow()
    expect(onMove).toHaveBeenCalledTimes(1)
  })

  test('does not listen to mouse events when Pointer Events are available', () => {
    const { onMove, onEnd, options } = makeOptions()
    beginDrag(mousedown(0, 0), options)

    fire('mousemove', { clientX: 10, clientY: 10 })
    fire('mouseup', { button: 0 })

    expect(onMove).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()

    fire('pointerup', { button: 0 }) // end the session
  })
})

describe('beginDrag — mouse fallback (no PointerEvent, e.g. Safari < 13 / macOS 10.13)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as any).PointerEvent
  })

  afterEach(() => {
    fire('mouseup', { button: 0, clientX: 0, clientY: 0 })
    ;(globalThis as any).PointerEvent = MouseEvent
  })

  test('tracks via mousemove/mouseup', () => {
    const { onMove, onEnd, options } = makeOptions()
    beginDrag(mousedown(100, 100), options)

    fire('mousemove', { clientX: 120, clientY: 90 })
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove.mock.lastCall[1]).toMatchObject({ dx: 20, dy: -10, moved: true })

    fire('pointermove', { clientX: 130, clientY: 90 }) // pointer events are NOT listened to
    expect(onMove).toHaveBeenCalledTimes(1)

    fire('mouseup', { button: 0 })
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onEnd.mock.lastCall[2]).toBe(false)
  })

  test('threshold and early cancel work the same', () => {
    const onMove = jest.fn().mockImplementation((_e, info: DragInfo) => {
      if (info.x > 50) return false
    })
    const { onEnd, options } = makeOptions({ threshold: 9, onMove })
    beginDrag(mousedown(0, 0), options)

    fire('mousemove', { clientX: 5, clientY: 5 })
    expect(onMove).not.toHaveBeenCalled()

    fire('mousemove', { clientX: 60, clientY: 0 })
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onEnd.mock.lastCall[2]).toBe(true) // canceled via false

    fire('mouseup', { button: 0 })
    expect(onEnd).toHaveBeenCalledTimes(1)
  })
})
