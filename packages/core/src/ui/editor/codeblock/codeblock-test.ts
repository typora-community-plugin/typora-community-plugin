import { useService } from "src/common/service"


/**
 * Register a simple test codeblock language (`typ-test`) with syntax
 * highlighting, fences autocomplete and a diagram render that shows the code
 * with `#` comments removed.
 *
 * @returns Dispose function to unregister it.
 */
export function setupTestCodeblock(
  codeblock = useService('markdown-editor').codeblock,
) {
  return codeblock.registerMode({
    lang: 'typ-test',
    mode: () => ({
      token(stream) {
        if (stream.eatSpace()) return null
        if (stream.match(/^#.*/)) return 'comment'
        if (stream.match(/^"[^"]*"/)) return 'string'
        if (stream.match(/^[0-9]+(\.[0-9]+)?/)) return 'number'
        stream.next()
        return null
      },
    }),
    render: code => {
      const stripped = code
        .split('\n')
        .map(line => line.replace(/(^|\s)#.*$/, ''))
        .join('\n')
        .trim()

      const pre = document.createElement('pre')
      pre.textContent = stripped
      pre.style.cssText = 'margin:0; padding:8px; white-space:pre-wrap; text-align: left;'
      return pre
    },
  })
}
