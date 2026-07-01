import { randomString } from "./random-string";


describe('randomString', () => {
  it('should return a string', () => {
    const result = randomString();
    expect(typeof result).toBe('string');
  });

  it('should return a string of length 6', () => {
    const result = randomString();
    expect(result.length).toBe(6);
  });

  it('should return a string containing only lowercase letters and digits', () => {
    const result = randomString();
    expect(result).toMatch(/^[a-z0-9]+$/);
  });

  it('should return different values on successive calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(randomString());
    }
    expect(results.size).toBeGreaterThanOrEqual(99);
  });
});
