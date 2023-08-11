import * as path from "path"
import { File } from "typora"


export function isMarkdownUrl(urlString: string) {
  if (!urlString) return false

  const url = new URL(urlString)
  const ext = path.extname(url.pathname)
  return !urlString.startsWith('http') && (
    !!ext || File.SupportedFiles.includes(ext)
  )
}
