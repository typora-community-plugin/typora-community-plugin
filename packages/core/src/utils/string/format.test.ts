import { format } from "./format";
import { describe, it, expect } from '@jest/globals';

describe('format', () => {
  it('should replace a single placeholder with the corresponding value', () => {
    expect(format('Hello, {name}!', { name: 'World' })).toBe('Hello, World!');
  });

  it('should replace multiple placeholders', () => {
    expect(format('{greeting}, {name}!', { greeting: 'Hi', name: 'Typora' })).toBe('Hi, Typora!');
  });

  it('should keep the placeholder unchanged when the key is missing from the dictionary', () => {
    expect(format('Hello, {name}!', {})).toBe('Hello, {name}!');
  });

  it('should keep the placeholder unchanged when a key is partially missing', () => {
    expect(format('{greeting}, {name}!', { greeting: 'Hi' })).toBe('Hi, {name}!');
  });

  it('should replace with falsy values (empty string, null should fall back to placeholder)', () => {
    expect(format('Value: {val}', { val: '' })).toBe('Value: ');
  });

  it('should handle numeric values', () => {
    expect(format('Count: {count}', { count: 42 })).toBe('Count: 42');
  });

  it('should handle object values converted to string', () => {
    expect(format('Obj: {obj}', { obj: { foo: 'bar' } })).toBe('Obj: [object Object]');
  });

  it('should handle templates with no placeholders', () => {
    expect(format('No placeholders here', {})).toBe('No placeholders here');
  });

  it('should handle multiple occurrences of the same placeholder', () => {
    expect(format('{name} loves {name}', { name: 'Typora' })).toBe('Typora loves Typora');
  });

  it('should handle empty template strings', () => {
    expect(format('', {})).toBe('');
  });

  it('should handle empty placeholder braces (empty key) with missing key', () => {
    expect(format('{}', {})).toBe('{}');
  });

  it('should ignore nested braces', () => {
    expect(format('{{inner}}', {})).toBe('{{inner}}');
    expect(format('{outer} {{inner}} {outer}', { outer: 'O' })).toBe('O {{inner}} O');
  });
});
