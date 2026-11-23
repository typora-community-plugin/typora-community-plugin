import 'src/setup-test-env'
import { isNativeClass, toES5Ctor, wrapClassesForES5 } from '../../src/utils/es5-shim'


class Base {
  a: number
  constructor(a: number) {
    this.a = a
  }
  greet() {
    return 'greet ' + this.a
  }
  static make() {
    return 'made'
  }
  static get ver() {
    return '1.0'
  }
}
// class fields only allow literal/unique-symbol computed names
;(Base as any)[Symbol.for('tag')] = 'base'

// babel `_inheritsLoose`
function inheritsLoose(sub: any, sup: any) {
  sub.prototype = Object.create(sup.prototype)
  sub.prototype.constructor = sub
  Object.setPrototypeOf(sub, sup)
}

describe('es5-shim', () => {

  describe('isNativeClass', () => {
    test('should accept ES6 classes', () => {
      expect(isNativeClass(Base)).toBe(true)
      expect(isNativeClass(class { })).toBe(true)
    })

    test('should reject plain functions and other values', () => {
      expect(isNativeClass(function foo() { })).toBe(false)
      expect(isNativeClass(() => { })).toBe(false)
      expect(isNativeClass(toES5Ctor(Base))).toBe(false)
      expect(isNativeClass({})).toBe(false)
      expect(isNativeClass('class')).toBe(false)
      expect(isNativeClass(undefined)).toBe(false)
    })
  })

  describe('toES5Ctor', () => {
    let Wrapped: typeof Base

    beforeEach(() => {
      Wrapped = toES5Ctor(Base)
    })

    test('should support `new` directly', () => {
      const instance = new Wrapped(7)
      expect(instance.a).toBe(7)
      expect(instance.greet()).toBe('greet 7')
      expect(instance instanceof Base).toBe(true)
      expect(instance instanceof Wrapped).toBe(true)
    })

    test('should support ES5 loose helpers (`_super.call(this, args)`)', () => {
      const Es5Loose = function (this: any, a: number) {
        const _this: any = Wrapped.apply(this, [a]) || this
        _this.custom = a * 2
        return _this
      } as unknown as typeof Base
      inheritsLoose(Es5Loose, Wrapped)
      ;(Es5Loose.prototype as any).customGreet = function (this: any) {
        return this.greet() + ' / ' + this.custom
      }

      const instance: any = new (Es5Loose as any)(3)
      expect(instance.a).toBe(3)                       // base ctor ran
      expect(instance.custom).toBe(6)                  // es5 ctor ran
      expect(instance.greet()).toBe('greet 3')         // base prototype reachable
      expect(instance.customGreet()).toBe('greet 3 / 6') // es5 prototype reachable
      expect(instance instanceof Base).toBe(true)
      expect(instance instanceof Es5Loose).toBe(true)
    })

    test('should support ES5 spec helpers (`Reflect.construct` with NewTarget)', () => {
      const Es5Spec = function (this: any, a: number) {
        const _this: any = Reflect.construct(Wrapped, [a], Es5Spec)
        _this.custom = a * 2
        return _this
      } as unknown as typeof Base
      inheritsLoose(Es5Spec, Wrapped)
      ;(Es5Spec.prototype as any).customGreet = function (this: any) {
        return this.greet() + ' / ' + this.custom
      }

      const instance: any = new (Es5Spec as any)(4)
      expect(instance.a).toBe(4)
      expect(instance.custom).toBe(8)
      expect(instance.customGreet()).toBe('greet 4 / 8')
      expect(instance instanceof Base).toBe(true)
      expect(instance instanceof Es5Spec).toBe(true)
    })

    test('should support native ES6 subclass', () => {
      class Sub extends Wrapped {
        b = 9
        greet() {
          return super.greet() + ' / ' + this.b
        }
      }

      const instance = new Sub(5)
      expect(instance.a).toBe(5)
      expect(instance.b).toBe(9)
      expect(instance.greet()).toBe('greet 5 / 9')
      expect(instance instanceof Base).toBe(true)
      expect(instance instanceof Sub).toBe(true)
    })

    test('should copy static members and name', () => {
      expect(Wrapped.make()).toBe('made')
      expect(Wrapped.ver).toBe('1.0')
      expect((Wrapped as any)[Symbol.for('tag')]).toBe('base')
      expect(Wrapped.name).toBe('Base')
    })

    test('should expose statics to subclasses via prototype chain', () => {
      class Sub extends Wrapped { }
      const Es5 = function (this: any) { return Wrapped.apply(this, [1]) || this } as any
      inheritsLoose(Es5, Wrapped)

      expect(Sub.make()).toBe('made')
      expect(Es5.make()).toBe('made')
      expect(Es5.ver).toBe('1.0')
    })

    test('should not modify the original class', () => {
      expect(Base.prototype.constructor).toBe(Base)
      expect(toES5Ctor(Base)).not.toBe(Base)
    })
  })

  describe('wrapClassesForES5', () => {
    test('should wrap native classes only, keeping other exports by reference', () => {
      const helper = function helper() { }
      const obj = { dir: '/tmp' }

      const wrapped = wrapClassesForES5({ Base, helper, obj })

      expect(wrapped.Base).not.toBe(Base)
      expect(isNativeClass(wrapped.Base)).toBe(false)
      expect(wrapped.helper).toBe(helper)
      expect(wrapped.obj).toBe(obj)
    })

    test('should keep the namespace shape', () => {
      const wrapped = wrapClassesForES5({ Base, helper: () => 1 })
      expect(Object.keys(wrapped)).toEqual(['Base', 'helper'])
    })
  })
})
