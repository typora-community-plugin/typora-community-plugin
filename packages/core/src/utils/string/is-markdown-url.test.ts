import { isMarkdownUrl } from "./is-markdown-url";
import { File } from "typora";


describe('isMarkdownUrl', () => {
  beforeEach(() => {
    File.SupportedFiles = ['.md', '.markdown'];
  });

  it('should return false for empty string', () => {
    expect(isMarkdownUrl('')).toBe(false);
  });

  it('should return false for undefined', () => {
    // @ts-ignore
    expect(isMarkdownUrl(undefined)).toBe(false);
  });

  it('should return false for HTTP URLs', () => {
    expect(isMarkdownUrl('http://example.com/image.png')).toBe(false);
  });

  it('should return false for HTTPS URLs', () => {
    expect(isMarkdownUrl('https://example.com/image.png')).toBe(false);
  });

  it('should return true for local .md file paths', () => {
    expect(isMarkdownUrl('/path/to/file.md')).toBe(true);
  });

  it('should return true for local file with supported extension', () => {
    expect(isMarkdownUrl('./relative/path/file.markdown')).toBe(true);
  });

  it('should return true for local file with any extension', () => {
    expect(isMarkdownUrl('/path/to/image.png')).toBe(true);
  });

  it('should return false for local file without extension', () => {
    expect(isMarkdownUrl('/path/to/no-extension')).toBe(false);
  });

  it('should handle file:// protocol URLs', () => {
    expect(isMarkdownUrl('file:///path/to/file.md')).toBe(true);
  });

  it('should return false for file:// URLs without extensions', () => {
    expect(isMarkdownUrl('file:///path/to/no-extension')).toBe(false);
  });
});
