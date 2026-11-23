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
