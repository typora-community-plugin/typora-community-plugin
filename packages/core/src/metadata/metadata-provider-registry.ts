import fs from 'src/io/fs/filesystem'
import type { DisposeFunc } from 'src/utils/types'
import type { MergeSpec } from './metadata-merge'


export class MetadataProviderContext {
  constructor(
    readonly filePath: string,
    private _textContent?: string,
    private _stats?: Awaited<ReturnType<typeof fs.stat>>
  ) { }

  text(): Promise<string> {
    return this._textContent
      ? Promise.resolve(this._textContent)
      : fs.readText(this.filePath).then(text => this._textContent = text)
  }

  fileStats(): Awaited<ReturnType<typeof fs.stat>> {
    return this._stats!
  }
}

export type MetadataProvider = (ctx: MetadataProviderContext) => Promise<Record<string, any>>

export interface RegisterOptions {
  merge?: MergeSpec
}

export interface ProviderEntry {
  provider: MetadataProvider
  merge?: MergeSpec
}

export function normalizeExtension(ext: string): string {
  return ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
}

function hashString(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++)
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i)
  return (hash >>> 0).toString(36)
}

/**
 * Derive a stable identifier for a provider from its name and source code.
 */
export function providerId(provider: MetadataProvider): string {
  return hashString(`${provider.name}\u0000${provider.toString()}`)
}

/**
 * Registry of metadata providers, keyed by normalized file extension.
 */
export class MetadataProviderRegistry {

  private providers: { [ext: string]: ProviderEntry[] } = {}

  /** Resolved identifier per provider function (see {@link RegisterOptions.id}). */
  private providerIds = new WeakMap<MetadataProvider, string>()

  /** Cached signature per extension, invalidated on register/unregister. */
  private signatures: { [ext: string]: string } = {}

  /**
   * Register a metadata provider for a file extension (with or without the
   * leading `.`).
   *
   * @returns A dispose function that unregisters the provider.
   */
  register(ext: string, provider: MetadataProvider, opts?: RegisterOptions): DisposeFunc {
    const key = normalizeExtension(ext)
    this.providerIds.set(provider, providerId(provider))
    if (!this.providers[key]) this.providers[key] = []
    this.providers[key].push({ provider, merge: opts?.merge })
    delete this.signatures[key]
    return () => this.unregister(ext, provider)
  }

  /**
   * Unregister a previously registered metadata provider.
   */
  unregister(ext: string, provider: MetadataProvider): void {
    const key = normalizeExtension(ext)
    const entries = this.providers[key]
    if (!entries) return

    const index = entries.findIndex(entry => entry.provider === provider)
    if (index === -1) return

    entries.splice(index, 1)
    delete this.signatures[key]
    if (entries.length === 0) delete this.providers[key]
  }

  /** Get the providers registered for a file extension. */
  get(ext: string): ProviderEntry[] | undefined {
    return this.providers[normalizeExtension(ext)]
  }

  /**
   * A stable signature of the provider set for a file extension, derived from
   * each provider's name and source code, suitable for detecting whether cached
   * metadata is still valid.
   *
   * Returns `''` when no provider is registered.
   */
  getSignature(ext: string): string {
    const key = normalizeExtension(ext)
    const entries = this.providers[key]
    if (!entries || entries.length === 0) return ''

    const cached = this.signatures[key]
    if (cached !== undefined) return cached

    const signature = entries
      .map(entry => this.providerIds.get(entry.provider) ?? providerId(entry.provider))
      .sort()
      .join('|')

    this.signatures[key] = signature
    return signature
  }
}
