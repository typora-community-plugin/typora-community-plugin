import { jest } from '@jest/globals'
import { HtmlPostProcessor } from './html-postprocessor'

describe('HtmlPostProcessor', () => {
  test('continues processing matching elements after one processor call fails', () => {
    document.body.innerHTML = `
      <div id="root">
        <code data-id="broken"></code>
        <code data-id="healthy"></code>
      </div>
    `

    const logger = { error: jest.fn() }
    const processor = new HtmlPostProcessor(logger as any)
    processor.selector = 'code'

    ;(globalThis as any).$ = (selector: string, root: Element) => ({
      toArray: () => Array.from(root.querySelectorAll(selector)),
    })

    const processed: string[] = []
    processor.process = element => {
      const id = element.getAttribute('data-id')!
      if (id === 'broken') throw new Error('broken code block')
      processed.push(id)
    }

    processor._process(document.querySelector('#root')!)

    expect(processed).toEqual(['healthy'])
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})
