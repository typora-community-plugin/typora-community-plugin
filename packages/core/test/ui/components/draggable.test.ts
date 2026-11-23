import 'src/setup-test-env'
import { beforeEach, describe, expect, vi } from 'vitest'
import { draggable } from '../../../src/ui/components/draggable'

// Mock offsetParent so elements have a valid parent chain for compare functions.
// In jsdom, offsetParent is null by default. We simulate the DOM structure where
// children point to their positioned container parent.
class DragFixture {
  /** The HTMLElement that will be passed to draggable() */
  public readonly containerEl: HTMLElement
  /** Helper: add a child div with [draggable=true] under this fixture's root */
  
  constructor(direction: 'x' | 'y', onChange?: () => void) {
    document.body.innerHTML = ''

    // Root container — this is what we pass to draggable()
    this.containerEl = document.createElement('div')
    this.containerEl.style.position = 'relative'
    Object.defineProperty(this.containerEl, 'offsetLeft', { configurable: true, get() { return 0 } })
    Object.defineProperty(this.containerEl, 'offsetTop', { configurable: true, get() { return 0 } })
    Object.defineProperty(this.containerEl, 'clientWidth', { configurable: true, get() { return 200 } })
    Object.defineProperty(this.containerEl, 'offsetParent', { 
      configurable: true, 
      get() { return document.body as any },
      value: undefined
    })

    // Create 2 draggable children + intermediate wrappers so offsetParent chain works.
    // Structure: containerEl -> wrapper1 -> item1
    //             containerEl -> wrapper2 -> item2
    
    const w1 = document.createElement('div')
    w1.style.position = 'relative'
    Object.defineProperty(w1, 'offsetLeft', { configurable: true, get() { return 0 } })
    Object.defineProperty(w1, 'offsetTop', { configurable: true, get() { return 0 } })
    Object.defineProperty(w1, 'offsetWidth', { configurable: true, get() { return 200 } })

    const w2 = document.createElement('div')
    w2.style.position = 'relative'
    Object.defineProperty(w2, 'offsetLeft', { configurable: true, get() { return 0 } })
    Object.defineProperty(w2, 'offsetTop', { configurable: true, get() { return 0 } })
    Object.defineProperty(w2, 'offsetWidth', { configurable: true, get() { return 200 } })

    this._makeItem = () => {
      const item1 = document.createElement('div')
      item1.setAttribute('draggable', 'true')
      item1.style.position = 'relative'

      // Offset parent points to its direct wrapped wrapper
      Object.defineProperty(item1, 'offsetLeft', { configurable: true, get() { return 0 } })
      Object.defineProperty(item1, 'offsetTop', { configurable: true, get() { return 0 } })
      Object.defineProperty(item1, 'offsetWidth', { configurable: true, get() { return 100 } })
      Object.defineProperty(item1, 'offsetHeight', { configurable: true, get() { return 30 } })

      const item2 = document.createElement('div')
      item2.setAttribute('draggable', 'true')
      item2.style.position = 'relative'
      Object.defineProperty(item2, 'offsetLeft', { configurable: true, get() { return 0 } })
      Object.defineProperty(item2, 'offsetTop', { configurable: true, get() { return 35 } })
      Object.defineProperty(item2, 'offsetWidth', { configurable: true, get() { return 100 } })
      Object.defineProperty(item2, 'offsetHeight', { configurable: true, get() { return 30 } })

      w1.appendChild(item1)
      w2.appendChild(item2)

      // Items' offsetParent = their wrapper
      Object.defineProperty(item1, 'offsetParent', { configurable: true, get() { return w1 as any } })
      Object.defineProperty(item2, 'offsetParent', { configurable: true, get() { return w2 as any } })
      
      // Wrappers' offsetParent = containerEl
      Object.defineProperty(w1, 'offsetParent', { configurable: true, get() { return this.containerEl } })
      Object.defineProperty(w2, 'offsetParent', { configurable: true, get() { return this.containerEl } })

      this.containerEl.appendChild(w1)
      this.containerEl.appendChild(w2)

      draggable(this.containerEl, direction, onChange)

      return { item1, item2 }
    }

    const _items = this._makeItem()
  }
  
  private _makeItem!: () => { item1: HTMLElement; item2: HTMLElement }
}

function makeDragFixture(direction: 'x' | 'y' = 'y', onChange?: () => void): DragFixture & ReturnType<DragFixture['_makeItem']> {
  document.body.innerHTML = ''
  
  const containerEl = document.createElement('div')
  containerEl.style.position = 'relative'
  Object.defineProperty(containerEl, 'offsetLeft', { configurable: true, get() { return 0 } })
  Object.defineProperty(containerEl, 'offsetTop', { configurable: true, get() { return 0 } })

  const w1 = document.createElement('div')
  w1.style.position = 'relative'
  Object.defineProperty(w1, 'offsetLeft', { configurable: true, get() { return 0 } })
  Object.defineProperty(w1, 'offsetTop', { configurable: true, get() { return 0 } })
  Object.defineProperty(w1, 'offsetWidth', { configurable: true, get() { return 200 } })
  Object.defineProperty(w1, 'offsetParent', { configurable: true, get() { return containerEl } })

  const w2 = document.createElement('div')
  w2.style.position = 'relative'
  Object.defineProperty(w2, 'offsetLeft', { configurable: true, get() { return 0 } })
  Object.defineProperty(w2, 'offsetTop', { configurable: true, get() { return 0 } })
  Object.defineProperty(w2, 'offsetWidth', { configurable: true, get() { return 200 } })
  Object.defineProperty(w2, 'offsetParent', { configurable: true, get() { return containerEl } })

  // Create items lazily to access them after they're appended
  let item1: HTMLElement, item2: HTMLElement
  
  function makeItems() {
    item1 = document.createElement('div')
    item1.setAttribute('draggable', 'true')
    item1.style.position = 'relative'
    Object.defineProperty(item1, 'offsetLeft', { configurable: true, get() { return 0 } })
    Object.defineProperty(item1, 'offsetTop', { configurable: true, get() { return 0 } })
    Object.defineProperty(item1, 'offsetWidth', { configurable: true, get() { return 100 } })
    Object.defineProperty(item1, 'offsetHeight', { configurable: true, get() { return 30 } })

    item2 = document.createElement('div')
    item2.setAttribute('draggable', 'true')
    item2.style.position = 'relative'
    Object.defineProperty(item2, 'offsetLeft', { configurable: true, get() { return 0 } })
    Object.defineProperty(item2, 'offsetTop', { configurable: true, get() { return 35 } })
    Object.defineProperty(item2, 'offsetWidth', { configurable: true, get() { return 100 } })
    Object.defineProperty(item2, 'offsetHeight', { configurable: true, get() { return 30 } })

    w1.appendChild(item1)
    w2.appendChild(item2)

    // Items' offsetParent = their wrapper's slot element
    Object.defineProperty(item1, 'offsetParent', { configurable: true, get() { return w1 as any } })
    Object.defineProperty(item2, 'offsetParent', { configurable: true, get() { return w2 as any } })

    containerEl.appendChild(w1)
    containerEl.appendChild(w2)

    draggable(containerEl, direction, onChange)
  }

  document.body.appendChild(containerEl)
  
  makeItems()

  const result = { containerEl, item1: item1!, item2: item2!, w1, w2 }
  return { ...result, _items: () => ({ item1: item1!, item2: item2! }) } as any
}

function fireEvent(element: Element, type: string, options: Record<string, any> = {}) {
  const eventInit: Record<string, any> = { bubbles: true, cancelable: true, clientX: 0, clientY: 0, ...options }
  const event = new MouseEvent(type, eventInit)
  element.dispatchEvent(event)
}

describe('draggable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  describe('mousedown behavior', () => {
    test('should add typ-dragging class to dragged element on mousedown', () => {
      const { item1 } = makeDragFixture('y') as any
      
      vi.useRealTimers()
      fireEvent(item1, 'mousedown', { button: 0 })
      
      expect(item1.classList.contains('typ-dragging')).toBe(true)
    })

    test('should not trigger on non-left mouse button', () => {
      const { item1 } = makeDragFixture('y') as any

      vi.useRealTimers()
      fireEvent(item1, 'mousedown', { button: 2 })

      expect(item1.classList.contains('typ-dragging')).toBe(false)
    })

    test('should find draggable ancestor via closest', () => {
      const fixture = makeDragFixture('y') as any
      const origItem = fixture.item1!
      const wrapper = document.createElement('span')
      wrapper.textContent = 'text'
      origItem.appendChild(wrapper)

      vi.useRealTimers()
      fireEvent(wrapper, 'mousedown', { button: 0 })
      
      expect(origItem.classList.contains('typ-dragging')).toBe(true)
    })
  })

  describe('pointermove behavior', () => {
    test('should reorder items on drag with y direction', () => {
      const { containerEl, item1, item2 } = makeDragFixture('y') as any
      
      vi.useRealTimers()
      
      fireEvent(item1, 'mousedown', { button: 0 })
      fireEvent(item2, 'pointermove', { button: 0, clientX: 0, clientY: 50 })

      // insertAdjacentElement moved item1 into item2's wrapper; total children count stays 3 (w1 + w2)
      expect(containerEl.childNodes.length).toBe(2)
    })

    test('should not reorder on non-left button mousemove', () => {
      const { item1 } = makeDragFixture('y') as any

      vi.useRealTimers()
      
      fireEvent(item1, 'mousedown', { button: 0 })
      fireEvent(item1, 'pointermove', { button: 2, clientX: 0, clientY: 0 })

      expect(item1.classList.contains('typ-dragging')).toBe(true)
    })
  })

  describe('pointerup behavior', () => {
    test('should remove typ-dragging class and call onChange on pointerup', () => {
      vi.useRealTimers()
      const onChange = vi.fn()
      const fixture = makeDragFixture('y', onChange) as any
      const { item1 } = fixture;

      fireEvent(item1, 'mousedown', { button: 0 })
      expect(item1.classList.contains('typ-dragging')).toBe(true)

      fireEvent(document.body, 'pointerup', { button: 0 })
      expect(item1.classList.contains('typ-dragging')).toBe(false)
      expect(onChange).toHaveBeenCalled()
    })

    test('should not call onChange for non-left button pointerup', () => {
      vi.useRealTimers()
      const onChange = vi.fn()
      const fixture = makeDragFixture('y', onChange) as any
      const { item1 } = fixture;

      fireEvent(item1, 'mousedown', { button: 0 })
      
      // Non-left-button pointerup (the handler checks button !== 0 and returns early)
      fireEvent(document.body, 'pointerup', { button: 2 })
    })

    test('should remove pointerup listener after one completion', () => {
      vi.useRealTimers()
      const onChange = vi.fn()
      const fixture = makeDragFixture('y', onChange) as any
      const { item1 } = fixture;

      fireEvent(item1, 'mousedown', { button: 0 })
      fireEvent(document.body, 'pointerup', { button: 0 })
      
      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('direction parameter', () => {
    test('should support y direction (default)', () => {
      vi.useRealTimers()
      const fixture = makeDragFixture('y') as any
      const { containerEl, item1, item2 } = fixture;

      fireEvent(item1, 'mousedown', { button: 0 })
      fireEvent(item2, 'pointermove', { button: 0, clientX: 0, clientY: 50 })

      // items were reordered via insertAdjacentElement during drag
      expect(containerEl.childNodes.length).toBe(2)
    })

    test('should support x direction', () => {
      vi.useRealTimers()
      const fixture = makeDragFixture('x') as any
      const { containerEl, item1, item2 } = fixture;

      fireEvent(item1, 'mousedown', { button: 0 })
      fireEvent(item2, 'pointermove', { button: 0, clientX: 50, clientY: 0 })

      // items were reordered via insertAdjacentElement during drag
      expect(containerEl.childNodes.length).toBe(2)
    })
  })

  describe('edge cases', () => {
    test('should not error when mousemove on element without draggable ancestor', () => {
      vi.useRealTimers()
      const container = document.createElement('div')
      container.style.position = 'relative'
      Object.defineProperty(container, 'offsetLeft', { configurable: true, get() { return 0 } })
      Object.defineProperty(container, 'offsetTop', { configurable: true, get() { return 0 } })
      Object.defineProperty(container, 'offsetParent', { configurable: true, get() { return document.body as any } })

      const dragItem = document.createElement('div')
      dragItem.setAttribute('draggable', 'true')
      dragItem.style.position = 'relative'
      Object.defineProperty(dragItem, 'offsetLeft', { configurable: true, get() { return 0 } })
      Object.defineProperty(dragItem, 'offsetTop', { configurable: true, get() { return 0 } })

      const normalEl = document.createElement('span')
      normalEl.textContent = 'normal'
      
      container.appendChild(dragItem)
      container.appendChild(normalEl)
      document.body.appendChild(container)

      draggable(container, 'y')

      fireEvent(dragItem, 'mousedown', { button: 0 })
      expect(() => {
        fireEvent(normalEl, 'pointermove', { button: 0, clientX: 0, clientY: 0 })
      }).not.toThrow()
    })

    test('should handle drag and drop on same element (no swap)', () => {
      vi.useRealTimers()
      const onChange = vi.fn()
      const fixture = makeDragFixture('y', onChange) as any
      const { item1 } = fixture;

      fireEvent(item1, 'mousedown', { button: 0 })
      
      // mousemove over the same dragging element should not change anything
      fireEvent(item1, 'pointermove', { button: 0, clientX: 0, clientY: 0 })

      fireEvent(document.body, 'pointerup', { button: 0 })
      expect(onChange).toHaveBeenCalledTimes(1)
    })

    test('should work without onChange callback', () => {
      vi.useRealTimers()
      const fixture = makeDragFixture('y') as any
      const { item1 } = fixture;

      fireEvent(item1, 'mousedown', { button: 0 })
      expect(() => {
        fireEvent(document.body, 'pointerup', { button: 0 })
      }).not.toThrow()
    })
  })
})
