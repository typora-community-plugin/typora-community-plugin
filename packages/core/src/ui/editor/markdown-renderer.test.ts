import 'src/setup-test-env'
import { jest, describe, expect, test, beforeEach } from '@jest/globals'


// `MarkdownRenderer` imports `typora` modules as bare globals. Provide the
// subset used by `renderTo()` before loading it.
class FakeNode {
  static parseFrom() {
    return [
      '<pre mdtype="fences" class="md-fences md-end-block" lang="mermaid" cid="1">'
      + 'graph TD; A--&gt;B'
      + '</pre>',
    ]
  }
}

function createJQuery() {
  return (selector: string, root: ParentNode = document) => {
    const nodes = Array.from(root.querySelectorAll(selector)) as HTMLElement[]
    const api = {
      length: nodes.length,
      each(callback: (index: number, el: HTMLElement) => void) {
        nodes.forEach((el, i) => callback(i, el))
        return api
      },
      attr(name: string, value: string) {
        nodes.forEach(el => el.setAttribute(name, value))
        return api
      },
      toArray() {
        return nodes
      },
      get(i: number) {
        return nodes[i]
      },
    }
    return api
  }
}

let MarkdownRenderer: typeof import('./markdown-renderer').MarkdownRenderer

beforeEach(async () => {
  document.body.innerHTML = ''

  ;(globalThis as any).$ = createJQuery()
  ;(globalThis as any).editor = {
    nodeMap: {
      allNodes: {
        first: () => ({ __proto__: { constructor: FakeNode } }),
      },
    },
    diagrams: {
      constructor: {
        isDiagramType: (lang: string) => ['sequence', 'flow', 'mermaid'].includes(lang),
      },
      lazyload: jest.fn(),
    },
  }
  ;(globalThis as any).CodeMirror = (el: HTMLElement) => {
    let value = ''
    return {
      setValue(v: string) {
        value = v
        el.textContent = v
      },
      getValue: () => value,
    }
  }
  ;(globalThis as any).File = {
    option: {
      noLineWrapping: false,
      showLineNumbersForFence: false,
      codeIndentSize: 2,
    },
  }
  ;(globalThis as any).MathJax = {
    typesetPromise: jest.fn(async () => { }),
  }
  ;(window as any).getCodeMirrorMode = () => 'mermaid'
  ;(globalThis as any).mermaidAPI = {
    render: jest.fn(async () => ({ svg: '<svg class="mermaid-svg"></svg>' })),
  }

  MarkdownRenderer = (await import('./markdown-renderer')).MarkdownRenderer
})

function createRenderer() {
  return new MarkdownRenderer({
    preProcessor: { process: (_stage: string, md: string) => md },
    postProcessor: { processAll: jest.fn() },
  } as any)
}


describe('MarkdownRenderer.renderTo()', () => {
  test('renders markdown synchronously by default', () => {
    const target = document.createElement('div')
    const renderer = createRenderer()

    expect(renderer.renderTo('# title', target)).toBeUndefined()
    expect(target.classList.contains('typ-markdown-preview')).toBe(true)
  })

  test('waits for detached diagrams when `async` is set', async () => {
    const target = document.createElement('div')
    const renderer = createRenderer()

    await renderer.renderTo('# title', target, { async: true })

    expect((globalThis as any).mermaidAPI.render).toHaveBeenCalledWith(
      expect.any(String),
      'graph TD; A-->B',
    )
    expect(target.querySelector('.md-diagram-panel-preview svg')).not.toBeNull()
  })
})
