import { describe, it, expect, jest } from '@jest/globals'
import { html, getElementPagePosition } from './html'

// Mock jQuery globally for tests
global.$ = jest.fn().mockReturnValue(document.createElement('div'))

describe('html', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should convert template literal to a jQuery-wrapped DOM element', () => {
    const resultEl: any = { id: 'test-el' }
    global.$ = jest.fn().mockReturnValue({ get: jest.fn(() => resultEl) })

    // TemplateStringsArray must be array-like with .reduce (from Array.prototype)
    // For `html\`<div>Hello </div>\``: strings[0]='<div>Hello ', values=['World'], strings[1]=']'
    // \`<div>Hello ${'World'}</div>\` => strings=['<div>Hello ', '</div>'], values=['World']
    const strings = Object.assign(['<div>Hello ', '</div>'], { raw: ['<div>Hello ', '</div>'] }) as any
    const result = html(strings, 'World')

    expect(global.$).toHaveBeenCalledWith('<div>Hello World</div>')
    expect(result).toBe(resultEl)
  })

  it('should concatenate multiple values', () => {
    let capturedArg: string | undefined
    global.$ = jest.fn().mockImplementation((arg) => {
      capturedArg = arg
      return { get: jest.fn(() => 'el') }
    })

    const strings = Object.assign(['<li class="', '">item</li>'], { raw: ['<li class="', '">item</li>'] }) as any
    html(strings, 'active', 'name')

    expect(capturedArg).toBe('<li class="active">item</li>')
  })

  it('should work with no interpolation values', () => {
    let capturedArg: string | undefined
    global.$ = jest.fn().mockImplementation((arg) => {
      capturedArg = arg
      return { get: jest.fn(() => 'el') }
    })

    const strings = Object.assign(['<span></span>'], { raw: ['<span></span>'] }) as any
    html(strings)

    expect(capturedArg).toBe('<span></span>')
  })

  it('should handle empty template string', () => {
    let capturedArg: string | undefined
    global.$ = jest.fn().mockImplementation((arg) => {
      capturedArg = arg
      return { get: jest.fn(() => 'el') }
    })

    const strings = Object.assign([''], { raw: [''] }) as any
    html(strings)

    expect(capturedArg).toBe('')
  })
})

describe('getElementPagePosition', () => {
  function makeElement(ox: number, oy: number): HTMLElement {
    const el = document.createElement('div') as unknown as HTMLElement & { _customOffsetParent?: HTMLElement }
    Object.defineProperty(el, 'offsetLeft', { configurable: true, get() { return ox } })
    Object.defineProperty(el, 'offsetTop', { configurable: true, get() { return oy } })
    return el
  }

  function chainParents(child: HTMLElement, parent: HTMLElement, grandparent?: HTMLElement) {
    if (grandparent) {
      Object.defineProperty(grandparent, 'offsetParent', { configurable: true, get() { return null } })
    }
    Object.defineProperty(parent, 'offsetParent', { configurable: true, get() { return grandparent ?? null } })
    Object.defineProperty(child, 'offsetParent', { configurable: true, get() { return parent } })
  }

  it('should return left=0, top=0 for element with no offsets and no offsetParent', () => {
    const el = makeElement(0, 0)
    Object.defineProperty(el, 'offsetParent', { configurable: true, get() { return null } })

    const result = getElementPagePosition(el as unknown as HTMLElement)
    expect(result).toEqual({ left: 0, top: 0 })
  })

  it('should sum offsets through a single offsetParent', () => {
    const child = makeElement(10, 20)
    const parent = makeElement(5, 15)
    
    Object.defineProperty(parent, 'offsetParent', { configurable: true, get() { return null } })
    Object.defineProperty(child, 'offsetParent', { configurable: true, get() { return parent } })

    const result = getElementPagePosition(child as unknown as HTMLElement)
    expect(result).toEqual({ left: 15, top: 35 })
  })

  it('should handle a chain of multiple offsetParents', () => {
    const grandparent = makeElement(100, 200)
    const parent = makeElement(10, 20)
    const child = makeElement(5, 10)

    Object.defineProperty(grandparent, 'offsetParent', { configurable: true, get() { return null } })
    Object.defineProperty(parent, 'offsetParent', { configurable: true, get() { return grandparent } })
    Object.defineProperty(child, 'offsetParent', { configurable: true, get() { return parent } })

    const result = getElementPagePosition(child as unknown as HTMLElement)
    expect(result).toEqual({ left: 115, top: 230 })
  })

  it('should stop at element with null offsetParent', () => {
    const el = makeElement(42, 87)
    Object.defineProperty(el, 'offsetParent', { configurable: true, get() { return null } })

    const result = getElementPagePosition(el as unknown as HTMLElement)
    expect(result).toEqual({ left: 42, top: 87 })
  })
})
