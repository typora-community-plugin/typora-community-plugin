import { truncate } from "./truncate";


describe('truncate', () => {
  it('should return the original string if it is shorter than the specified length', () => {
    const str = 'hello';
    const truncated = truncate(str, { length: 10 });
    expect(truncated).toBe(str);
  });

  it('should truncate the string to the specified length with default omission', () => {
    const str = 'hello world';
    const truncated = truncate(str, { length: 5 });
    expect(truncated).toBe('he...');
  });

  it('should truncate the string to the specified length with custom omission', () => {
    const str = 'hello world';
    const truncated = truncate(str, { length: 5, omission: '***' });
    expect(truncated).toBe('he***');
  });

  it('should truncate the string with a length less than or equal to the omission length', () => {
    const str = 'hello';
    const truncated = truncate(str, { length: 1, omission: '...' });
    expect(truncated).toBe('...');
  });

  it('should truncate the string with a negative length', () => {
    const str = 'hello world';
    const truncated = truncate(str, { length: -10 });
    expect(truncated).toBe('...');
  });

  it('should truncate the string with no options provided', () => {
    const str = 'hello world! how are you today? fine, thank you.';
    const truncated = truncate(str);
    expect(truncated).toBe('hello world! how are you to...');
  });

  it('should truncate the string with a zero length', () => {
    const str = 'hello world';
    const truncated = truncate(str, { length: 0 });
    expect(truncated).toBe('...');
  });

  it('should throw an error if options are not an object', () => {
    const str = 'hello world';
    expect(() => truncate(str, 'not-an-object')).toThrow();
  });

  it('should throw an error if length is not a number', () => {
    const str = 'hello world';
    // @ts-ignore
    expect(() => truncate(str, { length: 'not-a-number' })).toThrow();
  });

  it('should not throw an error if omission is not a string', () => {
    const str = 'hello world';
    // @ts-ignore
    const truncated = truncate(str, { length: 5, omission: 123 });
    expect(truncated).toBe('he123');
  });
});
