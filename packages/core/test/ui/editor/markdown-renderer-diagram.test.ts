import 'src/setup-test-env'
import { registerDiagramRenderer, unregisterDiagramRenderer } from 'src/ui/editor/codeblock/codeblock-diagram'
import { renderDiagramBlocks } from 'src/ui/editor/markdown-renderer-diagram'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'


function createCodeblock(lang: string, code: string) {
  const pre = document.createElement('pre')
  pre.className = 'md-fences md-end-block'
  pre.setAttribute('lang', lang)
  pre.textContent = code
  return pre
}

function getCode(codeblock: HTMLElement) {
  return codeblock.textContent ?? ''
}

async function renderRoot(...codeblocks: HTMLElement[]) {
  const root = document.createElement('div')
  root.append(...codeblocks)
  await renderDiagramBlocks(root, getCode)
  return root
}


describe('renderDiagramBlocks()', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    ;(globalThis as any).editor = {
      diagrams: {
        constructor: {
          MODES: ['sequence', 'flow', 'mermaid'],
          isDiagramType: (lang: string) => ['sequence', 'flow', 'mermaid', 'typ-diagram'].includes(lang),
        },
        lazyload: vi.fn(),
      },
    }
    delete (globalThis as any).mermaidAPI
  })

  afterEach(() => {
    delete (globalThis as any).mermaidAPI
    delete (globalThis as any).Diagram
    delete (globalThis as any).flowchart
    unregisterDiagramRenderer('typ-diagram')
  })


  test('renders mermaid in a detached container', async () => {
    const render = vi.fn(async () => ({ svg: '<svg class="mermaid-svg"></svg>' }))
    ;(globalThis as any).mermaidAPI = { render }

    const codeblock = createCodeblock('mermaid', 'graph TD; A-->B')

    await renderRoot(codeblock)

    expect(render).toHaveBeenCalledWith(expect.any(String), 'graph TD; A-->B')
    // No container is passed to mermaid: the SVG is rendered in `document.body`
    // and inserted afterwards, so the target may be detached.
    expect(render.mock.calls[0]).toHaveLength(2)

    expect(codeblock.classList.contains('md-diagram')).toBe(true)
    expect(codeblock.querySelector('.md-diagram-panel-preview svg')).not.toBeNull()
  })

  test('supports the legacy mermaid API that returns the SVG string', async () => {
    ;(globalThis as any).mermaidAPI = {
      render: vi.fn(() => '<svg class="legacy-mermaid-svg"></svg>'),
    }

    const root = await renderRoot(createCodeblock('mermaid', 'graph TD; A-->B'))

    expect(root.querySelector('.legacy-mermaid-svg')).not.toBeNull()
  })

  test('calls bindFunctions on the rendered mermaid element', async () => {
    const bindFunctions = vi.fn()
    ;(globalThis as any).mermaidAPI = {
      render: vi.fn(async () => ({ svg: '<svg></svg>', bindFunctions })),
    }

    const root = await renderRoot(createCodeblock('mermaid', 'graph TD; A-->B'))

    const preview = root.querySelector('.md-diagram-panel-preview')!
    expect(bindFunctions).toHaveBeenCalledWith(preview)
  })

  test('draws sequence diagrams in an attached container when detached', async () => {
    const drawSVG = vi.fn((container: HTMLElement) => {
      expect(container.isConnected).toBe(true)
      container.append(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
    })
    ;(globalThis as any).Diagram = {
      parse: () => ({ drawSVG }),
    }

    const codeblock = createCodeblock('sequence', 'A->B')

    await renderRoot(codeblock)

    expect(drawSVG).toHaveBeenCalled()
    expect(codeblock.querySelector('.md-diagram-panel-preview svg')).not.toBeNull()
  })

  test('uses a registered codeblock renderer', async () => {
    const render = vi.fn(() => '<div class="custom-diagram"></div>')
    registerDiagramRenderer('typ-diagram', render)

    const codeblock = createCodeblock('typ-diagram', 'custom source')

    await renderRoot(codeblock)

    expect(render).toHaveBeenCalledWith('custom source')
    expect(codeblock.querySelector('.custom-diagram')).not.toBeNull()
  })

  test('skips non-diagram codeblocks', async () => {
    const render = vi.fn(async () => ({ svg: '<svg></svg>' }))
    ;(globalThis as any).mermaidAPI = { render }

    const codeblock = createCodeblock('javascript', 'const a = 1')

    await renderRoot(codeblock)

    expect(render).not.toHaveBeenCalled()
    expect(codeblock.querySelector('.md-diagram-panel')).toBeNull()
  })

  test('shows the render error and keeps the preview usable', async () => {
    ;(globalThis as any).mermaidAPI = {
      render: vi.fn(async () => { throw new Error('parse error') }),
    }

    const codeblock = createCodeblock('mermaid', 'invalid')

    await renderRoot(codeblock)

    expect(codeblock.querySelector('.md-diagram-panel-error')!.textContent)
      .toBe('mermaid error: parse error')
    expect(codeblock.querySelector('.md-diagram-panel-preview')!.innerHTML).toBe('')
  })
})


describe('renderDiagramBlocks() engine loading', () => {

  beforeEach(() => {
    document.body.innerHTML = ''
    ;(globalThis as any).editor = {
      diagrams: {
        constructor: { MODES: ['mermaid'] },
        lazyload: vi.fn(),
      },
    }
    delete (globalThis as any).mermaidAPI
    delete (globalThis as any).Diagram
    delete (globalThis as any).flowchart
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as any).mermaidAPI
    delete (globalThis as any).Diagram
    delete (globalThis as any).flowchart
    unregisterDiagramRenderer('typ-diagram')
  })

  test('gives up quietly when engines never load', async () => {
    vi.useFakeTimers()
    const codeblock = createCodeblock('mermaid', 'graph')
    const root = document.createElement('div')
    root.append(codeblock)

    const rendering = renderDiagramBlocks(root, getCode)
    await vi.advanceTimersByTimeAsync(15_000)
    await rendering

    expect(codeblock.querySelector('.md-diagram-panel-preview')!.innerHTML).toBe('')
  })

  test('waits for modeLoaded and asks Typora to lazyload when idle', async () => {
    vi.useFakeTimers()
    const diagrams = (globalThis as any).editor.diagrams
    diagrams.lazyload = vi.fn(() => {
      diagrams.modeLoaded = true
    })

    const v = document.createElement('div')
    v.append(createCodeblock('mermaid', 'graph'))
    const rendering = renderDiagramBlocks(v, getCode)

    expect(diagrams.lazyload).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(100)
    await rendering
  })

  test('does not lazyload when a diagram script is already in flight', async () => {
    vi.useFakeTimers()
    const script = document.createElement('script')
    script.src = '/app/diagram/mermaid/mermaid.min.js'
    document.head.append(script)
    const diagrams = (globalThis as any).editor.diagrams

    const v = document.createElement('div')
    v.append(createCodeblock('mermaid', 'graph'))
    const rendering = renderDiagramBlocks(v, getCode)
    await vi.advanceTimersByTimeAsync(15_000)
    await rendering

    expect(diagrams.lazyload).not.toHaveBeenCalled()
  })
})


describe('renderDiagramBlocks() rendering details', () => {

  beforeEach(() => {
    document.body.innerHTML = ''
    ;(globalThis as any).editor = {
      diagrams: {
        constructor: {
          MODES: ['sequence', 'flow', 'mermaid'],
          isDiagramType: (lang: string) => ['sequence', 'flow', 'mermaid', 'typ-diagram'].includes(lang),
        },
      },
    }
    delete (globalThis as any).mermaidAPI
    delete (globalThis as any).Diagram
    delete (globalThis as any).flowchart
  })

  afterEach(() => {
    delete (globalThis as any).mermaidAPI
    delete (globalThis as any).Diagram
    delete (globalThis as any).flowchart
    unregisterDiagramRenderer('typ-diagram')
  })

  test('renders flowchart diagrams with the native engine', async () => {
    const code = 'st=>start: A\r\ne=>end'
    let parsed = ''
    const drawSVG = vi.fn()
    ;(globalThis as any).flowchart = {
      parse: (source: string) => {
        parsed = source
        return { drawSVG }
      },
    }

    const codeblock = createCodeblock('flow', code)
    await renderRoot(codeblock)

    expect(parsed).toBe('st=>start: A\ne=>end')
    expect(drawSVG).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      y: 0,
      'font-color': 'currentColor',
    }))
  })

  test('clears the preview for empty diagram code', async () => {
    const codeblock = createCodeblock('mermaid', '   ')
    codeblock.querySelector('.md-diagram-panel-preview')

    await renderRoot(codeblock)

    expect(codeblock.querySelector('.md-diagram-panel-preview')!.innerHTML).toBe('')
  })

  test('skips codeblocks without a language', async () => {
    const codeblock = createCodeblock('', 'text')
    codeblock.removeAttribute('lang')

    const root = await renderRoot(codeblock)

    expect(root.querySelector('.md-diagram-panel')).toBeNull()
  })

  test('falls back to mermaid when the diagram manager has no isDiagramType', async () => {
    ;(globalThis as any).editor.diagrams = { constructor: { MODES: [] } }
    const render = vi.fn(async () => ({ svg: '<svg></svg>' }))
    ;(globalThis as any).mermaidAPI = { render }

    await renderRoot(createCodeblock('mermaid', 'graph'))

    expect(render).toHaveBeenCalled()
  })

  test('clones the hidden component template for the preview panel', async () => {
    const template = document.createElement('div')
    template.id = 'componenet'
    template.innerHTML = `
      <div class="md-diagram-panel">
        <div class="md-diagram-panel-preview"></div>
      </div>
    `
    document.body.append(template)
    registerDiagramRenderer('typ-diagram', () => '<span class="templated">ok</span>')

    const codeblock = createCodeblock('typ-diagram', 'x')
    await renderRoot(codeblock)

    const panel = codeblock.querySelector(':scope > .md-diagram-panel') as HTMLElement
    expect(panel).not.toBe(template.querySelector('.md-diagram-panel'))
    expect(panel.style.position).toBe('initial')
    expect(panel.querySelectorAll('.md-diagram-panel-preview')).toHaveLength(1)
    expect(panel.querySelector('.templated')).not.toBeNull()
  })

  test('reuses an existing panel when rendering twice', async () => {
    const render = vi.fn(() => '<svg class="again"></svg>')
    registerDiagramRenderer('typ-diagram', render)
    const codeblock = createCodeblock('typ-diagram', 'x')

    await renderRoot(codeblock)
    const panel = codeblock.querySelector('.md-diagram-panel')
    await renderRoot(codeblock)

    expect(codeblock.querySelectorAll('.md-diagram-panel')).toHaveLength(1)
    expect(codeblock.querySelector('.md-diagram-panel')).toBe(panel)
  })

  test('mounts element output from a custom renderer', async () => {
    const element = document.createElement('div')
    element.className = 'element-output'
    registerDiagramRenderer('typ-diagram', () => element)

    const codeblock = createCodeblock('typ-diagram', 'x')
    await renderRoot(codeblock)

    expect(codeblock.querySelector('.element-output')).toBe(element)
  })

  test('leaves the preview empty when mermaid returns no svg', async () => {
    ;(globalThis as any).mermaidAPI = {
      render: vi.fn(async () => ({})),
    }

    const codeblock = createCodeblock('mermaid', 'graph')
    await renderRoot(codeblock)

    expect(codeblock.querySelector('.md-diagram-panel-preview')!.innerHTML).toBe('')
  })

  test('draws directly into an attached preview for sequence diagrams', async () => {
    const drawSVG = vi.fn((container: HTMLElement) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('data-connected', String(container.isConnected))
      container.append(svg)
    })
    ;(globalThis as any).Diagram = { parse: () => ({ drawSVG }) }

    const root = document.createElement('div')
    document.body.append(root)
    const codeblock = createCodeblock('sequence', 'A->B')
    root.append(codeblock)

    await renderDiagramBlocks(root, getCode)

    const svg = codeblock.querySelector('.md-diagram-panel-preview svg')!
    expect(svg.getAttribute('data-connected')).toBe('true')
  })

  test('applies the hand theme to sequence diagrams', async () => {
    document.body.style.setProperty('--sequence-theme', 'hand')
    const drawSVG = vi.fn()
    ;(globalThis as any).Diagram = { parse: () => ({ drawSVG }) }

    try {
      await renderRoot(createCodeblock('sequence', 'A->B'))
      expect(drawSVG).toHaveBeenCalledWith(expect.any(HTMLElement), { theme: 'hand' })
    }
    finally {
      document.body.style.removeProperty('--sequence-theme')
    }
  })
})
