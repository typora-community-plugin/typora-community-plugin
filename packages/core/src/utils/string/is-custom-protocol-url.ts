const KNOWN_SCHEMES = new Set(['file', 'http', 'https', 'data'])

export function isCustomProtocolUrl(url: string): boolean {
  if (!url) return false

  const colonIdx = url.indexOf(':')
  if (colonIdx <= 0) return false

  // reject Windows drive letters (e.g. C:\path, D:/path)
  const afterColon = url[colonIdx + 1]
  if (afterColon === '\\') return false
  if (/^[a-zA-Z]$/.test(afterColon)) return false

  const scheme = url.slice(0, colonIdx).toLowerCase()
  if (KNOWN_SCHEMES.has(scheme)) return false

  // must have :// after the scheme — check positions after the colon
  return url[colonIdx + 1] === '/' && url[colonIdx + 2] === '/'
}
