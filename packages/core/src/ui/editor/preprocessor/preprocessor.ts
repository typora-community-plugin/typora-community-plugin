import decorate from '@plylrnsdy/decorate.js'
import { editor, File } from 'typora'
import { useService } from 'src/common/service'
import type { MarkdownEditor } from '../markdown-editor'
import { HtmlMask, RegexpBasedStringMask } from './string-mask'
import type { DisposeFunc } from 'src/utils/types'


type ProcessTime = 'preload' | 'presave'

type MarkdownType = 'mdtext' | 'code'

export type TPreProcessor = {
  when: ProcessTime,
  type: MarkdownType,
  process: (s: string) => string,
}

type Processors = Record<ProcessTime, Record<MarkdownType, TPreProcessor[]> & { length: number }>

// Part `(?:^|\n)(\s*`{3,})(?:.|\n)+?\1` handle multi-line codeblock
// Part `(`+).+?\2`                      handle single line codeblock
export const RE_CODEBLOCK = /(?:^|\n)(\s*`{3,})(?:.|\n)+?\1|(`+).+?\2/g

export class MarkdownPreProcessor {

  private _processors: Processors = {
    preload: { code: [], mdtext: [], length: 0 },
    presave: { code: [], mdtext: [], length: 0 },
  }

  codeMasker = new RegexpBasedStringMask(RE_CODEBLOCK, '___CODE_PLACEHOLDER___')

  htmlMasker = new HtmlMask('___HTML_PLACEHOLDER___')

  constructor(
    private logger = useService('logger', ['MarkdownPreProcessor']),
  ) { }

  register(processor: TPreProcessor): DisposeFunc {
    const { when, type } = processor
    const o = this._processors[when]
    o[type].push(processor)
    o.length++
    return () => this.unregister(processor)
  }

  unregister(processor: TPreProcessor) {
    const { when, type } = processor
    const o = this._processors[when]
    o[type] = o[type].filter(p => p !== processor)
    o.length--
  }

  isEmpty(when: ProcessTime) {
    return !this._processors[when].length
  }

  process(when: ProcessTime, md: string) {
    this.codeMasker.reset()
    this.htmlMasker.reset()

    const original = md

    try {
      // pre-process

      md = this.codeMasker.mask(md)

      if (when === 'preload') {
        md = this.htmlMasker.mask(md)
      }

      // process

      md = this._processors[when]['mdtext'].reduce((res, o) => o.process(res), md)

      this._processors[when]['code'].forEach((p) =>
        this.codeMasker.processMasked(p.process)
      )

      // post-process

      if (when === 'preload') {
        md = this.htmlMasker.unmask(md)
      }

      md = this.codeMasker.unmask(md)

      return md
    }
    catch (error) {
      this.logger.error(error)
      return original
    }
  }
}

export function bindPreProcessorToEditor(mdEditor: MarkdownEditor) {

  const { preProcessor } = mdEditor

  File.isNode
    ? decorate.returnValue(File, 'readContentFrom', (args, res) => {
      if (preProcessor.isEmpty('preload')) {
        return res
      }

      res[1] = preProcessor.process('preload', res[1])
      return res
    })
    : decorate.parameters(File, 'loadFile', (args) => {
      if (preProcessor.isEmpty('preload')) {
        return args
      }

      args[2][0] = preProcessor.process('preload', args[2][0])
      return args
    })

  decorate.returnValue(editor, 'getMarkdown', (args, md) => {
    if (preProcessor.isEmpty('presave')) {
      return md
    }
    return preProcessor.process('presave', md)
  })
}
