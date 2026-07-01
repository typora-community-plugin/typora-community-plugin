import { parseSimplifiedYAML, parseTagsWithPositionsFromYAML } from "./yaml";
import { describe, it, expect } from '@jest/globals';

describe('parseSimplifiedYAML', () => {
  it('should return empty object for empty or falsy input', () => {
    expect(parseSimplifiedYAML('')).toEqual({});
    expect(parseSimplifiedYAML(null as any)).toEqual({});
    expect(parseSimplifiedYAML(undefined as any)).toEqual({});
  });

  it('should parse simple key-value pairs', () => {
    const input = 'title: Test Title\nauthor: John';
    const result = parseSimplifiedYAML(input);
    expect(result).toEqual({ title: 'Test Title', author: 'John' });
  });

  it('should handle boolean values', () => {
    const input = 'enabled: true\ndisabled: false';
    const result = parseSimplifiedYAML(input);
    expect(result).toEqual({ enabled: 'true', disabled: 'false' });
  });

  it('should parse inline arrays', () => {
    const input = 'tags: [a, b, c]';
    const result = parseSimplifiedYAML(input);
    expect(result.tags).toEqual(['a', 'b', 'c']);
  });

  it('should parse inline objects', () => {
    const input = 'meta: {name: value, count: 5}';
    const result = parseSimplifiedYAML(input);
    expect(result.meta).toEqual({ name: 'value', count: '5' });
  });

  it('should return empty object for root-level list items', () => {
    const input = '- item1\n- item2\n- item3';
    const result = parseSimplifiedYAML(input);
    // Root-level arrays are coerced to empty objects (parseSimplifiedYAML removes the "" internal key)
    expect(result).toEqual({});
  });

  it('should return empty object for root-level list items with +', () => {
    const input = '+ item1\n+ item2\n+ item3';
    const result = parseSimplifiedYAML(input);
    expect(result).toEqual({});
  });

  it('should parse nested objects via indentation', () => {
    const input = 'parent:\n  child: value\n  another: 42';
    const result = parseSimplifiedYAML(input);
    expect(result.parent).toEqual({ child: 'value', another: '42' });
  });

  it('should parse key-value with nested list', () => {
    const input = 'items:\n  - one\n  - two\n  - three';
    const result = parseSimplifiedYAML(input);
    expect(result.items).toEqual(['one', 'two', 'three']);
  });

  it('should handle literal block scalar (|)', () => {
    const input = 'description: |\n  line1\n  line2\n  line3';
    const result = parseSimplifiedYAML(input);
    expect(result.description).toBe('line1\nline2\nline3');
  });

  it('should handle folded block scalar (>)', () => {
    const input = 'description: >\n  line1\n  line2\n  line3';
    const result = parseSimplifiedYAML(input);
    expect(result.description).toBe('line1 line2 line3');
  });

  it('should parse quoted string values', () => {
    const input = 'title: "Quoted Title"';
    const result = parseSimplifiedYAML(input);
    expect(result.title).toBe('Quoted Title');
  });

  it('should parse single-quoted string values', () => {
    const input = "title: 'Single-Quoted Title'";
    const result = parseSimplifiedYAML(input);
    expect(result.title).toBe('Single-Quoted Title');
  });

  it('should handle multi-line quoted values', () => {
    const input = 'title: "Line1\n  Line2\n  Line3"';
    const result = parseSimplifiedYAML(input);
    expect(result.title).toBe('Line1 Line2 Line3');
  });

  it('should ignore comment lines', () => {
    const input = '# comment\nkey: value\n# another comment';
    const result = parseSimplifiedYAML(input);
    expect(result).toEqual({ key: 'value' });
  });

  it('should parse key-value list', () => {
    const input = 'tags:\n  - tag1\n  - tag2\n  - tag3';
    const result = parseSimplifiedYAML(input);
    expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
  });
});

describe('parseTagsWithPositionsFromYAML', () => {
  it('should return empty array for empty or falsy input', () => {
    expect(parseTagsWithPositionsFromYAML('', 0)).toEqual([]);
    expect(parseTagsWithPositionsFromYAML(null as any, 0)).toEqual([]);
    expect(parseTagsWithPositionsFromYAML(undefined as any, 0)).toEqual([]);
  });

  it('should return empty array when no tags key exists', () => {
    expect(parseTagsWithPositionsFromYAML('title: test\nauthor: John', 0)).toEqual([]);
  });

  it('should parse inline array tags', () => {
    const input = 'tags: [tag1, tag2, tag3]';
    const result = parseTagsWithPositionsFromYAML(input, 1);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: 'tag1', lineText: 'tags: [tag1, tag2, tag3]', lineNumber: 2 });
    expect(result[1]).toEqual({ name: 'tag2', lineText: 'tags: [tag1, tag2, tag3]', lineNumber: 2 });
    expect(result[2]).toEqual({ name: 'tag3', lineText: 'tags: [tag1, tag2, tag3]', lineNumber: 2 });
  });

  it('should parse single value tag', () => {
    const input = 'tags: singleTag';
    const result = parseTagsWithPositionsFromYAML(input, 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: 'singleTag', lineText: 'tags: singleTag', lineNumber: 2 });
  });

  it('should parse list-style tags with correct line numbers', () => {
    const input = 'title: My Title\ntags:\n  - tag1\n  - tag2\n  - tag3';
    const result = parseTagsWithPositionsFromYAML(input, 0);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: 'tag1', lineText: '- tag1', lineNumber: 3 });
    expect(result[1]).toEqual({ name: 'tag2', lineText: '- tag2', lineNumber: 4 });
    expect(result[2]).toEqual({ name: 'tag3', lineText: '- tag3', lineNumber: 5 });
  });

  it('should handle list items starting with +', () => {
    const input = 'tags:\n  + tag1\n  + tag2';
    const result = parseTagsWithPositionsFromYAML(input, 0);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('tag1');
    expect(result[1].name).toBe('tag2');
  });

  it('should handle empty lines and comments within tag list', () => {
    const input = 'tags:\n  - tag1\n  # comment\n  - tag2\n\n  - tag3';
    const result = parseTagsWithPositionsFromYAML(input, 0);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('tag1');
    expect(result[1].name).toBe('tag2');
    expect(result[2].name).toBe('tag3');
  });

  it('should correctly add startLine offset to line numbers', () => {
    const input = 'tags:\n  - tag1\n  - tag2';
    const result = parseTagsWithPositionsFromYAML(input, 5);
    expect(result[0].lineNumber).toBe(7);  // line index 1 + 5 + 1 (1-based)
    expect(result[1].lineNumber).toBe(8);  // line index 2 + 5 + 1 (1-based)
  });

  it('should strip quotes from tag names', () => {
    const input = 'tags: ["quotedTag", \'single\' ]';
    const result = parseTagsWithPositionsFromYAML(input, 0);
    expect(result[0].name).toBe('quotedTag');
    expect(result[1].name).toBe('single');
  });

  it('should stop parsing tag list when indentation decreases', () => {
    const input = 'tags:\n  - tag1\n  - tag2\nauthor: John';
    const result = parseTagsWithPositionsFromYAML(input, 0);
    expect(result).toHaveLength(2);
  });

  it('should not match quoted tags key (current limitation)', () => {
    // keyValRegex matches "tags" with quotes, but comparison is against bare "tags",
    // so currently quoted key tags are not detected
    const input = '"tags":\n  - tag1\n  - tag2';
    const result = parseTagsWithPositionsFromYAML(input, 0);
    expect(result).toHaveLength(0);
  });
});
