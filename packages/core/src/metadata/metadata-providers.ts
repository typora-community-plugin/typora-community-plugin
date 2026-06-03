import type { MetadataManager, MetadataProvider } from "./metadata-manager"
import { parseMarkdown, parseSimplifiedYAML, parseTagsWithPositionsFromYAML, parseTitles } from "src/utils"

export function registerDefaultMetadataProviders(metadata: MetadataManager) {
  metadata.register('md', markdown)
}

export const markdown: MetadataProvider = async (ctx) => {
  const md = await ctx.text()
  const { frontMatter, content, startLine, contentStartLine } = parseMarkdown(md)

  const frontmatter = parseSimplifiedYAML(frontMatter)
  const tags = parseTagsWithPositionsFromYAML(frontMatter, startLine)
  const titles = parseTitles(content, contentStartLine)

  return { frontmatter, tags, titles }
}
