import decorate from '@plylrnsdy/decorate.js'
import { editor, File } from 'typora'
import type { DisposeFunc } from 'src/utils/types'
import { StringExtractor } from './string-extractor'


type ProcessTime = 'preload' | 'presave'

type MarkdownType = 'mdtext' | 'code'

export type TPreProcessor = {
  when: ProcessTime,
  type: MarkdownType,
  process: (s: string) => string,
}

type Processors = Record<ProcessTime, Record<MarkdownType, TPreProcessor[]> & { length: number }>

// Part `\n(\s*`{3,})(?:.|\n)+?\1` handle multi-line codeblock
// Part `.(`+).+?\2`               handle single line codeblock
export const RE_CODEBLOCK = /\n(\s*`{3,})(?:.|\n)+?\1|.(`+).+?\2/g

export const RE_HTML = /(?:\n|.)<\/?[A-Za-z-]+[^>]*>/g

export class MarkdownPreProcessor {

  private _processors: Processors = {
    preload: { code: [], mdtext: [], length: 0 },
    presave: { code: [], mdtext: [], length: 0 },
  }

  private _codeExtractor = new StringExtractor(RE_CODEBLOCK, '___CODE_PLACEHOLDER___')

  private _htmlExtractor = new StringExtractor(RE_HTML, '___HTML_PLACEHOLDER___')

  constructor() {
    this._registerProcessors()
  }

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

  protected _registerProcessors() {
    File.isNode
      ? decorate.returnValue(File, 'readContentFrom', (args, res) => {
        if (!this._processors.preload.length) {
          return res
        }

        res[1] = this._process('preload', res[1])
        return res
      })
      : decorate.parameters(File, 'loadFile', (args) => {
        if (!this._processors.preload.length) {
          return args
        }

        args[2][0] = this._process('preload', args[2][0])
        return args
      })

    decorate.returnValue(editor, 'getMarkdown', (args, md) => {
      if (!this._processors.presave.length) {
        return md
      }
      return this._process('presave', md)
    })
  }

  protected _process(when: ProcessTime, md: string) {

    // pre-process

    md = this._codeExtractor.extract(md)

    if (when === 'preload') {
      md = this._htmlExtractor.extract(md)
    }

    // process

    md = this._processors[when]['mdtext'].reduce((res, o) => o.process(res), md)

    this._processors[when]['code'].forEach((p) =>
      this._codeExtractor.process(p.process)
    )

    // post-process

    if (when === 'preload') {
      md = this._htmlExtractor.rebuild(md)
    }

    md = this._codeExtractor.rebuild(md)

    this._codeExtractor.reset()
    this._htmlExtractor.reset()

    return md
  }
}
