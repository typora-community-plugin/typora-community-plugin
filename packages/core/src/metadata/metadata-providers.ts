import type { MetadataManager, MetadataProvider } from "./metadata-manager"
import { parseMarkdown, parseSimplifiedYAML } from "src/utils"


export function registerDefaultMetadataProviders(metadata: MetadataManager) {
  metadata.register('md', markdown)
}

export const markdown: MetadataProvider = async (ctx) => {
  const md = await ctx.text()
  const { frontMatter } = parseMarkdown(md)
  const frontmatter = parseSimplifiedYAML(frontMatter)
  return { frontmatter }
}
