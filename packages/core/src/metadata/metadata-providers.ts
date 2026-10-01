import type { MetadataManager, MetadataProvider } from "./metadata-manager"
import { ImageView } from "src/ui/views/image-view"
import { MarkdownView } from "src/ui/views/markdown-view"
import { parseMarkdown, parseSimplifiedYAML, parseTagsWithPositionsFromYAML, parseTitles } from "src/utils"


export function registerDefaultMetadataProviders(metadata: MetadataManager) {
  MarkdownView.extensions.forEach(ext => {
    metadata.register(ext, basicMeta)
    metadata.register(ext, markdown)
  })
  ImageView.extensions.forEach(ext => {
    metadata.register(ext, basicMeta)
  })
}

export const markdown: MetadataProvider = async (ctx) => {
  const md = await ctx.text()
  const { frontMatter, content, startLine, contentStartLine } = parseMarkdown(md)

  const frontmatter = parseSimplifiedYAML(frontMatter)
  const tags = parseTagsWithPositionsFromYAML(frontMatter, startLine)
  const titles = parseTitles(content, contentStartLine)

  return { metadata: { frontmatter, tags, titles } }
}

export const basicMeta: MetadataProvider = async (ctx) => {
  const stats = ctx.fileStats()

  return {
    mtime: stats.mtimeMs,
    size: stats.size,
  }
}
