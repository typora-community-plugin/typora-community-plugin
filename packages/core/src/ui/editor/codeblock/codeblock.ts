import { CodeMirror, editor } from "typora"
import { useService } from "src/common/service"
import type { CodeMirrorModeFactory } from "typora"
import type { ILogger } from "src/io/logger/logger"
import type { DisposeFunc } from "src/utils/types"
import { hookDiagramEngine, registerDiagramRenderer, unregisterDiagramRenderer } from "./codeblock-diagram"
import type { CodeblockRenderer } from "./codeblock-diagram"


export interface CodeblockModeOptions {
  /** Code fence language, also the CodeMirror mode name. */
  lang: string
  /** CodeMirror mode definition. */
  mode: CodeMirrorModeFactory
  /**
   * When set, Typora's native diagram engine treats `lang` as a diagram type
   * (`DiagramClass.MODES` / `isDiagramType`) and calls this to render the
   * preview from `diagrams.updateDiagram`.
   */
  render?: CodeblockRenderer
}


/**
 * Register a codeblock language to Typora's CodeMirror, so it can be used as a
 * code fence language with syntax highlighting and autocomplete.
 *
 * Preview rendering (mermaid-like diagrams) is out of scope, use
 * `CodeblockPostProcessor` instead.
 */
export class Codeblock {

  constructor(
    private logger: ILogger = useService('logger', ['Codeblock']),
  ) {
    hookDiagramEngine()
  }

  /**
   * Register a CodeMirror syntax highlighting mode, and make Typora recognize
   * the language in the fences autocomplete list (`editor.fences.ALL`).
   *
   * If {@link CodeblockModeOptions.render} is set, the language is also hooked
   * into Typora's native diagram engine.
   *
   * @returns Dispose function to unregister the mode.
   */
  registerMode(options: CodeblockModeOptions): DisposeFunc {
    const { lang } = options
    const fences = editor.fences

    CodeMirror.defineMode(lang, options.mode)

    const addedToFences = !fences.ALL.includes(lang)
    if (addedToFences) fences.ALL.push(lang)

    if (options.render) {
      registerDiagramRenderer(lang, options.render)
    }

    this.logger.info(`registered codeblock mode "${lang}"`)

    return () => {
      delete CodeMirror.modes[lang]

      if (addedToFences) {
        const index = fences.ALL.indexOf(lang)
        if (index >= 0) fences.ALL.splice(index, 1)
      }

      if (options.render) unregisterDiagramRenderer(lang)

      this.logger.info(`unregistered codeblock mode "${lang}"`)
    }
  }
}
