import path from "src/path"
import { File } from "typora"


export function isMarkdownUrl(urlString: string) {
  if (!urlString) return false

  urlString = /^\w+:\/{2}/.test(urlString) ? urlString : `file://${urlString}`
  const url = new URL(urlString)
  const ext = path.extname(url.pathname)
  return !urlString.startsWith('http') && (
    !!ext || File.SupportedFiles.includes(ext)
  )
}
