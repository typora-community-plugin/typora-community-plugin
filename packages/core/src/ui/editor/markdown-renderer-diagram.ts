import { editor } from "typora"
import { uniqueId } from "src/utils"
import { getDiagramRenderer } from "./codeblock/codeblock-diagram"


interface MermaidRenderResult {
  svg?: string
  bindFunctions?(element: Element): void
}

interface MermaidAPI {
  /**
   * Mermaid 10+ returns `{ svg, bindFunctions }`; older versions used by
   * Typora 1.1.x-1.8.x return the SVG string directly.
   */
  render(id: string, code: string): Promise<MermaidRenderResult | string> | MermaidRenderResult | string
}

interface DiagramManager {
  constructor: {
    isDiagramType?(lang: string): boolean
  }
  modeLoaded?: boolean
  lazyload?(): void
}

interface DiagramEngine {
  parse(code: string): {
    drawSVG(container: HTMLElement, options: Record<string, unknown>): void
  }
}

interface DiagramRuntime {
  mermaidAPI?: MermaidAPI
  Diagram?: DiagramEngine
  flowchart?: DiagramEngine
}

type DiagramMount = (container: HTMLElement) => void

interface DiagramRenderResult {
  mount: DiagramMount
}

const ENGINE_LOAD_INTERVAL = 100
const ENGINE_LOAD_TIMEOUT = 15_000
const MERMAID_ID_PREFIX = 'typ-preview-mermaid-'
const ENGINE_SCRIPT_SELECTOR = [
  'script[src*="diagram/mermaid"]',
  'script[src*="diagram/diagram"]',
  'script[src*="diagram/sequence"]',
  'script[src*="diagram/flowchart"]',
].join(', ')

const runtime = globalThis as unknown as DiagramRuntime

let enginesPromise: Promise<void> | undefined


function getDiagramManager(): DiagramManager | undefined {
  return (editor as any)?.diagrams
}

function hasDiagramEngine() {
  return !!(runtime.mermaidAPI || runtime.Diagram || runtime.flowchart)
}

/**
 * Typora starts lazy-loading its native diagram engines (mermaid, sequence,
 * flowchart) when the editor is created, so normally we only need to wait for
 * `window.mermaidAPI`.
 *
 * Only ask Typora to load them when nothing indicates loading has started;
 * calling `lazyload()` while the scripts are in flight would load them twice.
 */
function isDiagramEngineLoading() {
  if (hasDiagramEngine()) return true
  if (getDiagramManager()?.modeLoaded) return true

  return !!document.querySelector(ENGINE_SCRIPT_SELECTOR)
}

/**
 * Wait until Typora's native diagram engines are available.
 *
 * The returned promise never rejects and resolves even when the engines cannot
 * be loaded, so the preview keeps showing the code block instead of throwing.
 */
function loadDiagramEngines(): Promise<void> {
  if (hasDiagramEngine()) return Promise.resolve()
  if (enginesPromise) return enginesPromise

  const manager = getDiagramManager()
  if (!isDiagramEngineLoading() && typeof manager?.lazyload === 'function')
    manager.lazyload()

  enginesPromise = new Promise(resolve => {
    const start = Date.now()
    const timer = setInterval(() => {
      if (hasDiagramEngine() || getDiagramManager()?.modeLoaded) {
        clearInterval(timer)
        resolve()
      }
      else if (Date.now() - start >= ENGINE_LOAD_TIMEOUT) {
        clearInterval(timer)
        enginesPromise = undefined
        resolve()
      }
    }, ENGINE_LOAD_INTERVAL)
  })

  return enginesPromise
}

function isDiagramType(lang: string) {
  const DiagramClass = getDiagramManager()?.constructor
  if (typeof DiagramClass?.isDiagramType === 'function')
    return !!DiagramClass.isDiagramType(lang)

  return lang === 'mermaid'
}

function normalizeLang(lang: unknown) {
  return typeof lang === 'string' ? lang.toLowerCase().trim() : ''
}

function getDiagramLang(el: HTMLElement) {
  return normalizeLang(el.getAttribute('lang'))
}

function createDiagramPanel() {
  const panel = document.createElement('div')
  panel.className = 'md-diagram-panel md-fences-adv-panel'
  panel.innerHTML = [
    '<div class="md-diagram-panel-header md-fences-adv-panel-header"></div>',
    '<div class="md-diagram-panel-preview md-fences-adv-panel-preview"></div>',
    '<div class="md-diagram-panel-error md-fences-adv-panel-error"></div>',
  ].join('')
  return panel
}

/**
 * Get the diagram panel of a rendered code block, cloning Typora's hidden
 * `#componenet` template on first use so preview panels do not share nodes
 * with the editor.
 */
function getOrCreateDiagramPanel(codeblock: HTMLElement) {
  const existing = codeblock.querySelector(':scope > .md-diagram-panel') as HTMLElement | null
  if (existing) return existing

  const template = document.querySelector('#componenet > .md-diagram-panel') as HTMLElement | null
  const panel = template
    ? template.cloneNode(true) as HTMLElement
    : createDiagramPanel()

  panel.style.cssText = 'position:initial; margin:0; padding:0;'
  codeblock.append(panel)

  return panel
}

function getOrCreatePanelPart(panel: HTMLElement, selector: string, className: string) {
  let part = panel.querySelector(selector) as HTMLElement | null
  if (part) return part

  part = document.createElement('div')
  part.className = className
  panel.append(part)

  return part
}

function ensureDiagramPanel(codeblock: HTMLElement) {
  const panel = getOrCreateDiagramPanel(codeblock)
  const preview = getOrCreatePanelPart(
    panel,
    '.md-diagram-panel-preview',
    'md-diagram-panel-preview md-fences-adv-panel-preview',
  )
  const error = getOrCreatePanelPart(
    panel,
    '.md-diagram-panel-error',
    'md-diagram-panel-error md-fences-adv-panel-error',
  )

  codeblock.classList.add('md-diagram', 'md-fences-advanced')

  return { preview, error }
}

function mountHtml(output: string | HTMLElement): DiagramMount {
  return container => {
    if (typeof output === 'string') {
      container.innerHTML = output
      return
    }

    container.innerHTML = ''
    container.append(output)
  }
}

function createOffscreenContainer() {
  const container = document.createElement('div')
  container.style.cssText = 'position:absolute;left:-100000px;top:0;visibility:hidden;'
  document.body.append(container)

  return container
}

/**
 * The native sequence/flowchart engines draw directly into the given element
 * and measure it. Draw in a temporarily attached, off-screen container when
 * the preview itself is detached, then move the result over.
 */
function mountInMeasuredContainer(draw: DiagramMount): DiagramMount {
  return container => {
    const drawTarget = container.isConnected ? container : createOffscreenContainer()

    try {
      drawTarget.innerHTML = ''
      draw(drawTarget)

      if (drawTarget !== container) {
        container.innerHTML = ''
        container.append(...Array.from(drawTarget.childNodes))
      }
    }
    finally {
      if (drawTarget !== container) drawTarget.remove()
    }
  }
}

function getSequenceDiagramOptions() {
  const theme = (window.getComputedStyle(document.body)
    .getPropertyValue('--sequence-theme') || '')
    .replace(/(^[\s'"]+)|([\s'"]+$)/g, '')
    .toLowerCase()

  return { theme: theme === 'hand' ? 'hand' : 'simple' }
}

function createMermaidMount(rendered: MermaidRenderResult | string): DiagramMount | undefined {
  const svg = typeof rendered === 'string' ? rendered : rendered.svg
  if (!svg) return

  const bindFunctions = typeof rendered === 'string'
    ? undefined
    : rendered.bindFunctions

  return container => {
    container.innerHTML = svg
    bindFunctions?.(container)
  }
}

async function renderMermaidDiagram(code: string): Promise<DiagramRenderResult | undefined> {
  const api = runtime.mermaidAPI
  if (!api) return

  const rendered = await api.render(uniqueId(MERMAID_ID_PREFIX), code)
  const mount = createMermaidMount(rendered)

  return mount ? { mount } : undefined
}

function renderSequenceDiagram(code: string): DiagramRenderResult | undefined {
  const Diagram = runtime.Diagram
  if (!Diagram) return

  const diagram = Diagram.parse(code || 'title: Empty Diagram')

  return {
    mount: mountInMeasuredContainer(container => {
      diagram.drawSVG(container, getSequenceDiagramOptions())
    }),
  }
}

function renderFlowchart(code: string): DiagramRenderResult | undefined {
  const flowchart = runtime.flowchart
  if (!flowchart) return

  const chart = flowchart.parse(code.replace(/\r/g, '')
    || 'st=>start: Empty Diagram\ne=>end\nst->e')

  return {
    mount: mountInMeasuredContainer(container => {
      chart.drawSVG(container, {
        y: 0,
        'font-color': 'currentColor',
        'line-color': 'currentColor',
        'element-color': 'currentColor',
        fill: 'var(--bg-color)',
      })
    }),
  }
}

async function renderDiagramContent(lang: string, code: string): Promise<DiagramRenderResult | undefined> {
  const custom = getDiagramRenderer(lang)
  if (custom) {
    const output = await custom(code)
    return { mount: mountHtml(output) }
  }

  await loadDiagramEngines()

  if (lang === 'mermaid') return renderMermaidDiagram(code)
  if (lang === 'sequence') return renderSequenceDiagram(code)
  if (lang === 'flow') return renderFlowchart(code)
}

async function renderDiagram(codeblock: HTMLElement, lang: string, code: string) {
  const { preview, error } = ensureDiagramPanel(codeblock)
  error.textContent = ''

  if (!code.trim()) {
    preview.innerHTML = ''
    return
  }

  try {
    const result = await renderDiagramContent(lang, code)
    result?.mount(preview)
  }
  catch (e) {
    preview.innerHTML = ''
    error.textContent = `${lang} error: ${(e as Error).message}`
  }
}

/**
 * Render the diagram code blocks in a markdown preview.
 *
 * `MarkdownRenderer` renders Markdown outside the editor document, so Typora's
 * native diagram engine cannot resolve the preview nodes by `cid`. Render the
 * diagrams directly instead, without requiring the target to be attached to
 * the document: mermaid (and the native sequence/flowchart engines) draw into a
 * temporary element in `document.body` and only the resulting SVG is inserted
 * into the preview.
 *
 * @param root Preview container produced by `MarkdownRenderer.renderTo()`.
 * @param getCode Resolve the source of a rendered code block.
 */
export async function renderDiagramBlocks(
  root: HTMLElement,
  getCode: (codeblock: HTMLElement) => string,
): Promise<void> {
  const codeblocks = Array.from(root.querySelectorAll<HTMLElement>('pre.md-fences'))
  const jobs = codeblocks.map(codeblock => {
    const lang = getDiagramLang(codeblock)
    if (!lang) return
    if (!getDiagramRenderer(lang) && !isDiagramType(lang)) return

    const code = getCode(codeblock)
    return renderDiagram(codeblock, lang, code)
  })

  await Promise.allSettled(jobs)
}
