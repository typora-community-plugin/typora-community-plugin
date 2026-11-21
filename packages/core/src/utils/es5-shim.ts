type AnyClass = abstract new (...args: any[]) => any

const uncopyableStaticKeys: (string | symbol)[] = ['length', 'name', 'prototype']

/**
 * Whether the value is a native (ES6) class, not a plain function.
 */
export function isNativeClass(value: unknown): value is AnyClass {
  return typeof value === 'function'
    && /^\s*class[\s{]/.test(Function.prototype.toString.call(value))
}

/**
 * Wrap a native ES6 class into a plain constructor function,
 * so that ES5-transpiled plugins (Babel `_inheritsLoose` + `_super.call(this, ...)`)
 * can inherit from the class.
 *
 * All inheritance styles are supported:
 * - `Super.apply(this, args)`: the ES5 instance's prototype is restored on the result;
 * - `Reflect.construct(Super, args, NewTarget)`: `new.target` is forwarded;
 * - native `class X extends Wrapped`: `new.target` is forwarded.
 *
 * Only use it at the dev-mode export boundary; the class identity inside core is untouched.
 */
export function toES5Ctor<T extends AnyClass>(Class: T): T {

  const ES5Ctor = function (this: any, ...args: any[]) {
    // `.apply(this, args)` (loose helpers): `new.target` is undefined,
    // `this` is the ES5 instance; reparent the constructed object to its prototype.
    const proto = new.target
      ? null
      : (this && Object.getPrototypeOf(this)) || ES5Ctor.prototype

    const instance = Reflect.construct(Class as unknown as new (...args: any[]) => any, args, new.target ?? ES5Ctor)

    if (proto && proto !== Object.getPrototypeOf(instance)) {
      Object.setPrototypeOf(instance, proto)
    }

    return instance
  }

  ES5Ctor.prototype = Class.prototype

  copyStatics(Class, ES5Ctor)

  return ES5Ctor as unknown as T
}

/**
 * Return a shallow copy of the exports namespace,
 * with every native class replaced by an ES5-compatible constructor (dev only).
 */
export function wrapClassesForES5<T extends Record<string, any>>(exports: T): T {
  const wrapped: Record<string, any> = { ...exports }

  for (const key of Object.keys(wrapped)) {
    if (isNativeClass(wrapped[key])) {
      wrapped[key] = toES5Ctor(wrapped[key])
    }
  }

  return wrapped as T
}

function copyStatics(from: any, to: any) {
  const keys = [...Object.getOwnPropertyNames(from), ...Object.getOwnPropertySymbols(from)]
    .filter(key => !uncopyableStaticKeys.includes(key))

  for (const key of keys) {
    Object.defineProperty(to, key, Object.getOwnPropertyDescriptor(from, key)!)
  }

  Object.defineProperty(to, 'name', { value: from.name, configurable: true })
}
