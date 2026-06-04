const RE_FRONT_MATTER = /^---\n([\s\S]+?)\n---\n?/
const RE_HEADING = /^#{1,6}\s+(.+)$/m

export interface TitleObject {
  /** The heading text (without `#` prefix). */
  name: string
  /** The full heading line text. */
  lineText: string
  /** 1-based line number in the original file. */
  lineNumber: number
}

/**
 * Extract all ATX headings from markdown content and return them
 * with their positions.
 *
 * @param content    Markdown text to search (typically after frontmatter is stripped).
 * @param lineOffset 0-based line offset of `content` within the original file.
 */
export function parseTitles(content: string, lineOffset: number = 0): TitleObject[] {
  const results: TitleObject[] = []
  const lines = content.split(/\r|\n|\r\n/g)

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(RE_HEADING)
    if (match) {
      results.push({
        name: match[1].trim(),
        lineText: lines[i].trim(),
        lineNumber: i + lineOffset + 1, // convert to 1-based
      })
    }
  }

  return results
}

export function parseMarkdown(md: string) {
  let frontMatter = ''
  let contentStartLine = 0

  const content = md
    .replace(RE_FRONT_MATTER, (match, $1) => {
      frontMatter = $1
      contentStartLine = (match.match(/\n/g) || []).length
      return ''
    })

  // Since the regex anchors at ^ (start of file), YAML content always starts at line index 1 (0-based).
  // Line 0 is `---`, line 1+ is the YAML body.
  const startLine = frontMatter ? 1 : -1

  return {
    frontMatter,
    get frontMatters() {
      return frontMatter ? frontMatter.split(/\n(?=\S)/) : []
    },
    content,
    /** 0-based line index in the original file where YAML content begins (after `---\n`). -1 if no frontmatter. */
    startLine,
    /** 0-based line index in the original file where `content` text begins. */
    contentStartLine,
  }
}
