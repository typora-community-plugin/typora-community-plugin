import type { DisposeFunc } from 'src/utils/types'
import { editor, File } from 'typora'
import decorate from '@plylrnsdy/decorate.js'


type ProcessTime = 'preload' | 'presave'

type MarkdownType = 'mdtext' | 'code'

export type TPreProcessor = {
  when: ProcessTime,
  type: MarkdownType,
  process: (s: string) => string,
}

type Processors = Record<ProcessTime, Record<MarkdownType, TPreProcessor[]> & { length: number }>

export class MarkdownPreProcessor {

  private _processors: Processors = {
    preload: { code: [], mdtext: [], length: 0 },
    presave: { code: [], mdtext: [], length: 0 },
  }

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

  private _registerProcessors() {
    decorate.returnValue(File, 'readContentFrom', (args, res) => {
      if (!this._processors.preload.length) {
        return res
      }

      res[1] = this._process('preload', res[1])
      return res
    })

    decorate.returnValue(editor, 'getMarkdown', (args, md) => {
      if (!this._processors.presave.length) {
        return md
      }
      return this._process('presave', md)
    })
  }

  private _process(when: ProcessTime, md: string) {

    let codeblocks: string[] = []
    let htmlTags: string[] = []

    // Part `(?<=\n)(\s*`{3,})(?:.|\n)+?\1` handle multi-line codeblock
    // Part `(?<!\\)(`+).+?\2`              handle single line codeblock
    md = md.replace(/(?<=\n)(\s*`{3,})(?:.|\n)+?\1|(?<!\\)(`+).+?\2/g, ($) => {
      codeblocks.push($)
      return '___CODE_PLACEHOLDER___'
    })

    if (when === 'preload') {
      md = md.replace(/(?<!\\)<\/?[A-Za-z-]+[^>]*>/g, ($) => {
        htmlTags.push($)
        return '___HTML_PLACEHOLDER___'
      })
    }

    md = this._processors[when]['mdtext'].reduce((res, o) => o.process(res), md)

    codeblocks = codeblocks.map(code =>
      this._processors[when]['code'].reduce((res, o) => o.process(res), code)
    )

    if (when === 'preload') {
      htmlTags.reverse()
      md = md.replace(/___HTML_PLACEHOLDER___/g, ($) => {
        return htmlTags.pop()!
      })
    }

    codeblocks.reverse()
    md = md.replace(/___CODE_PLACEHOLDER___/g, ($) => {
      return codeblocks.pop()!
    })

    return md
  }
}
