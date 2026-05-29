const RE_FRONT_MATTER = /^---\n([\s\S]+?)\n---\n?/

export function parseMarkdown(md: string) {
  let frontMatter = ''

  const content = md
    .replace(RE_FRONT_MATTER, (_, $1) => {
      frontMatter = $1
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
  }
}
