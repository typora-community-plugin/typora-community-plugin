// Test-only runtime stub for the `typora` module injected by the Typora app.
//
// In production, `esbuild-plugin-typora` rewrites `import { X } from 'typora'`
// into runtime global lookups, so tests that assign `globalThis.File`,
// `globalThis._options`, `globalThis.editor`, ... take effect at call time.
// Vite does not rewrite these imports, so the mock exports are live Proxies
// forwarding property access to the globals.
//
// Defaults keep jsdom deterministic: File.isNode=false makes `src/path` fall
// back to its BrowserPath implementation. jsdom also ships a `File`
// constructor (the File API), so function-valued globals are treated as
// "not provided by tests".

/** @param {string} target @param {Record<string, any>} defaults */
const live = (target, defaults = {}) => {
  // writes through the module export (`File.SupportedFiles = [...]`) are
  // collected here; reads prefer the live global, then overrides, defaults.
  /** @type {Record<string | symbol, any>} */
  const overrides = {}
  const source = () => {
    const obj = globalThis[target]
    return typeof obj === 'function' && !/^(CodeMirror|Rangy)$/.test(target) ? undefined : obj
  }
  return new Proxy(/** @type {any} */ ({}), {
    get: (_t, prop) => {
      const obj = source()
      if (obj && prop in obj) return obj[prop]
      return prop in overrides ? overrides[prop] : defaults[prop]
    },
    set: (_t, prop, value) => {
      overrides[prop] = value
      return true
    },
    has: () => true,
    // deep-equality checks (expect(x).toHaveBeenCalledWith(...)) compare
    // own keys, so mirror the global's descriptors.
    ownKeys: () => {
      const obj = source()
      return obj ? Reflect.ownKeys(obj) : []
    },
    getOwnPropertyDescriptor: (_t, prop) => {
      const obj = source()
      const d = obj && Reflect.getOwnPropertyDescriptor(obj, prop)
      return d && { ...d, configurable: true }
    },
  })
}

export const File = live('File', { isWin: false, isNode: false })
export const _options = live('_options', {})
export const editor = live('editor', {})
export const app = live('app', {})
export const MathJax = live('MathJax', {})
export const Diagram = live('Diagram', {})
export const JSBridge = live('JSBridge', { callHandler: () => { } })
export const bridge = live('bridge', { callHandler: () => { } })

// callable globals
export const CodeMirror = new Proxy(/** @type {any} */ (() => { }), {
  apply: (_t, _th, args) => (globalThis.CodeMirror ?? (() => { }))(...args),
  get: (_t, prop) => globalThis.CodeMirror?.[prop],
  has: () => true,
})
export const Rangy = live('Rangy', {})
export const ClientCommand = () => { }
export const reqnode = () => undefined
export const Version = "0.0.0"
