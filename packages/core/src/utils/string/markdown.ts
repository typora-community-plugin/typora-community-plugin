const RE_FRONT_MATTER = /^---\n([\s\S]+?)\n---\n?/

export function parseMarkdown(md: string) {
  let frontMatter = ''

  const content = md
    .replace(RE_FRONT_MATTER, (_, $1) => {
      frontMatter = $1
      return ''
    })

  return {
    frontMatter,
    get frontMatters() {
      return frontMatter ? frontMatter.split(/\n(?=\S)/) : []
    },
    content,
  }
}
