import { noop } from "./noop"

describe('noop function', () => {

  it('should return undefined', () => {
    expect(noop()).toBeUndefined()
  })

  it('should accept arguments without error', () => {
    // @ts-ignore
    expect(noop(1, 'hello', true)).toBeUndefined()
  })

  it('should return undefined consistently on multiple calls', () => {
    noop()
    noop()
    noop()
    expect(noop()).toBeUndefined()
  })

  it('should work with typed inputs that are ignored', () => {
    // @ts-ignore
    noop(42, 'string', null, undefined, {}, [])
    expect(noop()).toBeUndefined()
  })

})
