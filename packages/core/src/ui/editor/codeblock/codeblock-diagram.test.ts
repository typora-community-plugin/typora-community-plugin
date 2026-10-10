import { hookDiagramEngine, registerDiagramRenderer, unregisterDiagramRenderer } from "./codeblock-diagram"


class FakeDiagramClass {
  static MODES = ['sequence', 'flow', 'mermaid']

  static isDiagramType(lang: unknown) {
    return typeof lang === 'string' && FakeDiagramClass.MODES.includes(lang.toLowerCase().trim())
  }

  updateDiagram() { }
}


function setupEditor() {
  const diagrams = new (FakeDiagramClass as any)()
  ;(globalThis as any).editor = { diagrams }
  hookDiagramEngine()
  return FakeDiagramClass
}


describe('hookDiagramEngine()', () => {
  afterEach(() => {
    unregisterDiagramRenderer('typ-test')
    unregisterDiagramRenderer('typ-other')
  })

  it('recognizes registered languages', () => {
    const DiagramClass = setupEditor()
    registerDiagramRenderer('typ-test', () => '')

    expect(DiagramClass.isDiagramType('typ-test')).toBe(true)
    expect(DiagramClass.isDiagramType(' Typ-Test ')).toBe(true)
    expect(DiagramClass.isDiagramType('typ-unknown')).toBe(false)
  })

  it('keeps the native result for non-registered languages', () => {
    const DiagramClass = setupEditor()

    expect(DiagramClass.isDiagramType('mermaid')).toBe(true)
    expect(DiagramClass.isDiagramType('unknown')).toBe(false)
  })

  it('does not throw when called with non-string values', () => {
    const DiagramClass = setupEditor()
    registerDiagramRenderer('typ-test', () => '')

    // Typora passes CodeMirror mode objects to `isDiagramType()`, e.g. a `json`
    // fence has `mode = { name: "javascript", json: true }`.
    expect(DiagramClass.isDiagramType({ name: 'javascript', json: true })).toBe(false)
    expect(DiagramClass.isDiagramType(0)).toBe(false)
    expect(DiagramClass.isDiagramType(true)).toBe(false)
    expect(DiagramClass.isDiagramType(null)).toBe(false)
    expect(DiagramClass.isDiagramType(undefined)).toBe(false)
  })

  it('unregisters languages', () => {
    const DiagramClass = setupEditor()
    registerDiagramRenderer('typ-other', () => '')
    unregisterDiagramRenderer('typ-other')

    expect(DiagramClass.isDiagramType('typ-other')).toBe(false)
    expect(FakeDiagramClass.MODES).not.toContain('typ-other')
  })
})
