import { capitalize } from "./capitalize";


describe('capitalize', () => {
  it('should capitalize the first letter and lowercase the rest', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should handle strings that are already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('should lowercase the remaining characters', () => {
    expect(capitalize('hello WORLD')).toBe('Hello world');
  });

  it('should handle all uppercase strings', () => {
    expect(capitalize('HELLO')).toBe('Hello');
  });

  it('should return an empty string for empty input', () => {
    expect(capitalize('')).toBe('');
  });

  it('should handle single character strings', () => {
    expect(capitalize('h')).toBe('H');
    expect(capitalize('H')).toBe('H');
  });

  it('should handle strings with special characters', () => {
    expect(capitalize('123hello')).toBe('123hello');
    expect(capitalize('-hello')).toBe('-hello');
  });
});
