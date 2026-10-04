import decorate from "@plylrnsdy/decorate.js"
import { Diagram, editor } from "typora"


/**
 * Render code into Typora's native diagram panel.
 *
 * @returns HTML string or element inserted into `.md-diagram-panel-preview`.
 */
export type CodeblockRenderer = (code: string) => string | HTMLElement

interface DiagramTarget {
  lang: string
  render: CodeblockRenderer
}


const renderers = new Map<string, CodeblockRenderer>()


function getDiagramModes(): string[] {
  return editor.diagrams.constructor.MODES
}

function findRenderer(cid: string): DiagramTarget | undefined {
  const node = editor.getNode(cid)
  const lang = ((node ? node.get('lang') : '') || '').toLowerCase().trim()
  if (lang) {
    const render = renderers.get(lang)
    if (render) return { lang, render }
  }

  const cm = editor.fences.getCm(cid)
  const mode = `${cm?.getOption('mode') ?? ''}`.toLowerCase().trim()
  if (mode) {
    const render = renderers.get(mode)
    if (render) return { lang: mode, render }
  }

  return undefined
}

function renderDiagram(diagrams: Diagram, cid: string, target: DiagramTarget, args: any[]) {
  const elem = editor.findElemById(cid)
  if (!elem || !elem.length) return

  const panel = elem.find('.md-diagram-panel')
  if (!panel.length) {
    // Native panel has not been built yet, ask Typora to start the preview.
    return diagrams.startPreview(cid, args[args.length - 1])
  }

  const previewEl = panel.find('.md-diagram-panel-preview')[0]
  const errorEl = panel.find('.md-diagram-panel-error')[0]
  const cm = editor.fences.getCm(cid)
  const node = editor.getNode(cid)
  const code = cm ? cm.getValue() : ((node ? node.get('text') : '') || '')

  if (errorEl) errorEl.innerHTML = ''
  if (!previewEl) return

  if (!code.trim()) {
    previewEl.innerHTML = ''
    return
  }

  try {
    const output = target.render(code)
    if (typeof output === 'string') {
      previewEl.innerHTML = output
    }
    else {
      previewEl.innerHTML = ''
      previewEl.append(output)
    }
  } catch (error) {
    if (errorEl) errorEl.textContent = `${target.lang} error: ${(error as Error).message}`
  }

  const height = panel.height() ?? 0
  const domElem = elem[0]
  if (domElem) {
    domElem.style.marginBottom = domElem.classList.contains('md-focus') ? `${height + 40}px` : ''
  }
}

/**
 * Hook Typora's native diagram engine, making `isDiagramType()` recognize the
 * registered languages and `updateDiagram()` render their previews.
 */
export function hookDiagramEngine() {
  const diagrams = editor.diagrams
  const DiagramClass = diagrams.constructor

  decorate.returnValue(DiagramClass, 'isDiagramType', ([lang], result) =>
    renderers.has((lang ?? '').toLowerCase().trim()) || result
  )

  decorate(diagrams, 'updateDiagram', fn =>
    async function (cid: string, ...args: any[]) {
      const target = findRenderer(cid)
      if (target) return renderDiagram(diagrams, cid, target, args)

      return fn(cid, ...args)
    }
  )
}

/**
 * Make Typora's native diagram engine treat `lang` as a diagram type and
 * render its preview with `render`.
 */
export function registerDiagramRenderer(lang: string, render: CodeblockRenderer) {
  renderers.set(lang, render)

  const modes = getDiagramModes()
  if (!modes.includes(lang)) modes.push(lang)
}

export function unregisterDiagramRenderer(lang: string) {
  renderers.delete(lang)

  const modes = getDiagramModes()
  const index = modes.indexOf(lang)
  if (index >= 0) modes.splice(index, 1)
}
