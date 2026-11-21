// Test-only runtime stub for the `typora` module injected by the Typora app.
// jsdom has no Node bindings; File.isNode=false makes `src/path` fall back to
// its BrowserPath implementation, keeping path semantics deterministic.
export const File = { isWin: false, isNode: false }
export const reqnode = () => undefined
export const JSBridge = { callHandler: () => { } }
export const bridge = { callHandler: () => { } }
export const ClientCommand = () => { }
export const _options = {}
export const Version = "0.0.0"
