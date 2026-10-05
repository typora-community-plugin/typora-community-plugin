import { isCustomProtocolUrl } from './is-custom-protocol-url'

describe('isCustomProtocolUrl', () => {
  it('should return false for empty string', () => {
    expect(isCustomProtocolUrl('')).toBe(false)
  })

  it('should return false for null/undefined', () => {
    // @ts-ignore
    expect(isCustomProtocolUrl(null)).toBe(false)
    // @ts-ignore
    expect(isCustomProtocolUrl(undefined)).toBe(false)
  })

  it('should return true for bookxnotepro:// custom protocol', () => {
    expect(isCustomProtocolUrl('bookxnotepro://opennote/?nb=test')).toBe(true)
  })

  it('should return true for zotero:// custom protocol', () => {
    expect(isCustomProtocolUrl('zotero://selection/library/abc123')).toBe(true)
  })

  it('should return true for obsidian:// custom protocol', () => {
    expect(isCustomProtocolUrl('obsidian://open?vault=main&file=Test')).toBe(true)
  })

  it('should return true for mailto: (no //)', () => {
    expect(isCustomProtocolUrl('mailto:test@example.com')).toBe(false)
  })

  it('should return false for file:// URLs', () => {
    expect(isCustomProtocolUrl('file:///path/to/file.md')).toBe(false)
  })

  it('should return false for http:// URLs', () => {
    expect(isCustomProtocolUrl('http://example.com')).toBe(false)
  })

  it('should return false for https:// URLs', () => {
    expect(isCustomProtocolUrl('https://example.com')).toBe(false)
  })

  it('should return false for data: URIs', () => {
    expect(isCustomProtocolUrl('data:text/html,<h1>hi</h1>')).toBe(false)
  })

  it('should return false for Windows C:\\ drive paths', () => {
    expect(isCustomProtocolUrl('C:\\Users\\test.md')).toBe(false)
    expect(isCustomProtocolUrl('C:/Users/test.md')).toBe(false)
  })

  it('should return false for D:\\ drive paths', () => {
    expect(isCustomProtocolUrl('D:\\path\\file.txt')).toBe(false)
  })

  it('should return false for relative file paths', () => {
    expect(isCustomProtocolUrl('./relative/path.md')).toBe(false)
    expect(isCustomProtocolUrl('../parent/file.md')).toBe(false)
    expect(isCustomProtocolUrl('just-a-file.md')).toBe(false)
  })

  it('should return false for absolute Unix paths', () => {
    expect(isCustomProtocolUrl('/path/to/file.md')).toBe(false)
  })

  it('should return true for other custom protocols with ://', () => {
    expect(isCustomProtocolUrl('myapp://action?param=value')).toBe(true)
    expect(isCustomProtocolUrl('vscode://file/path/to/file.ts:100')).toBe(true)
  })

  it('should handle URLs with special characters in scheme body', () => {
    expect(isCustomProtocolUrl(
      'bookxnotepro://opennote/?nb=%7B7cd600f0-6469-4d77-9a86-e5e59e2928a3%7D&book=fba2ba688fa22b0c7147ef6bfb67638b&page=41'
    )).toBe(true)
  })
})
