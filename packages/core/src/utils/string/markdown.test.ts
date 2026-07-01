import { parseTitles, parseMarkdown } from "./markdown";

describe('parseTitles', () => {
  it('should return empty array for empty content', () => {
    expect(parseTitles('')).toEqual([]);
    expect(parseTitles('', 0)).toEqual([]);
  });

  it('should return empty array for content without headings', () => {
    expect(parseTitles('Some plain text\nNo headings here')).toEqual([]);
  });

  it('should parse single H1 heading', () => {
    const result = parseTitles('# Title', 0);
    expect(result).toEqual([
      { name: 'Title', lineText: '# Title', lineNumber: 1 },
    ]);
  });

  it('should parse headings of all levels (H1-H6)', () => {
    const content = [
      '# H1',
      '## H2',
      '### H3',
      '#### H4',
      '##### H5',
      '###### H6',
    ].join('\n');

    const result = parseTitles(content, 0);
    expect(result).toHaveLength(6);
    expect(result[0]).toEqual({ name: 'H1', lineText: '# H1', lineNumber: 1 });
    expect(result[3]).toEqual({ name: 'H4', lineText: '#### H4', lineNumber: 4 });
    expect(result[5]).toEqual({ name: 'H6', lineText: '###### H6', lineNumber: 6 });
  });

  it('should respect lineOffset', () => {
    const content = '# Title';
    const result = parseTitles(content, 5);
    expect(result[0].lineNumber).toBe(6); // 0 + 5 + 1 = 6
  });

  it('should handle multiple headings with mixed content', () => {
    const content = [
      'Some text',
      '# First',
      'More text',
      '## Second',
      'Paragraph',
    ].join('\n');

    const result = parseTitles(content, 0);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'First', lineText: '# First', lineNumber: 2 });
    expect(result[1]).toEqual({ name: 'Second', lineText: '## Second', lineNumber: 4 });
  });

  it('should trim heading name', () => {
    const result = parseTitles('#  Title with spaces  ', 0);
    expect(result[0].name).toBe('Title with spaces');
  });

  it('should trim heading name and lineText for trailing/leading spaces', () => {
    const result = parseTitles('# Heading with trailing spaces   ', 0);
    expect(result[0].name).toBe('Heading with trailing spaces');
    expect(result[0].lineText).toBe('# Heading with trailing spaces');
  });

  it('should handle headings with inline markdown', () => {
    const result = parseTitles('# Title with **bold** and *italic*', 0);
    expect(result[0].name).toBe('Title with **bold** and *italic*');
  });

  it('should not match invalid headings (no space after #)', () => {
    expect(parseTitles('#NotAHeading')).toEqual([]);
    expect(parseTitles('####### Too many #s')).toEqual([]);
  });
});

describe('parseMarkdown', () => {
  it('should return empty frontmatter for content without frontmatter', () => {
    const result = parseMarkdown('# Hello');
    expect(result.frontMatter).toBe('');
    expect(result.content).toBe('# Hello');
    expect(result.startLine).toBe(-1);
    expect(result.contentStartLine).toBe(0);
    expect(result.frontMatters).toEqual([]);
  });

  it('should parse simple frontmatter', () => {
    const md = '---\ntitle: Test\ndate: 2024-01-01\n---\n# Content';
    const result = parseMarkdown(md);

    expect(result.frontMatter).toBe('title: Test\ndate: 2024-01-01');
    expect(result.content).toBe('# Content');
    expect(result.startLine).toBe(1);
    expect(result.contentStartLine).toBe(4); // 3 lines for frontmatter including closing ---
  });

  it('should parse frontmatter with contentStartLine', () => {
    const md = '---\nkey: value\n---\nLine1\nLine2';
    const result = parseMarkdown(md);

    expect(result.content).toBe('Line1\nLine2');
    expect(result.contentStartLine).toBe(3); // ---\n, key: value\n, ---\n => 3 newlines
  });

  it('should parse frontMatters as array', () => {
    const md = '---\ntitle: Test\nauthor: John\n---\nContent';
    const result = parseMarkdown(md);

    const fms = result.frontMatters;
    expect(fms.length).toBeGreaterThan(0);
    expect(fms[0]).toContain('title: Test');
  });

  it('should handle frontmatter without trailing newline after closing ---', () => {
    const md = '---\ntitle: Test\n---\n# Title';
    const result = parseMarkdown(md);

    expect(result.frontMatter).toBe('title: Test');
    expect(result.content).toBe('# Title');
  });

  it('should preserve content when no frontmatter is present', () => {
    const content = '# Hello\n## World\nSome text';
    const result = parseMarkdown(content);
    expect(result.content).toBe(content);
  });

  it('should handle multiline frontmatter values', () => {
    const md = '---\ndescription: |\n  Line 1\n  Line 2\ntags:\n  - a\n  - b\n---\n# H1';
    const result = parseMarkdown(md);

    expect(result.frontMatter).toContain('Line 1');
    expect(result.frontMatter).toContain('tags:');
    expect(result.content).toBe('# H1');
  });

  it('should handle empty string input', () => {
    const result = parseMarkdown('');
    expect(result.frontMatter).toBe('');
    expect(result.content).toBe('');
    expect(result.startLine).toBe(-1);
  });
});
