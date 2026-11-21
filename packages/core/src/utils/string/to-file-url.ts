/**
 * Convert a local file path to an encode-ready `file://` URL,
 * escaping `#` and `?` that break media element `src` resolution.
 */
export function toFileUrl(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^([^/])/, '/$1')
  return encodeURI('file://' + normalized)
    .replace(/#/g, '%23')
    .replace(/\?/g, '%3F')
}
