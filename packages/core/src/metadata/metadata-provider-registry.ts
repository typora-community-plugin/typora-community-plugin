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

/**
 * Registry of metadata providers, keyed by normalized file extension.
 */
export class MetadataProviderRegistry {

  private providers: { [ext: string]: ProviderEntry[] } = {}

  /**
   * Register a metadata provider for a file extension (with or without the
   * leading `.`).
   *
   * @returns A dispose function that unregisters the provider.
   */
  register(ext: string, provider: MetadataProvider, opts?: RegisterOptions): DisposeFunc {
    const key = normalizeExtension(ext)
    if (!this.providers[key]) this.providers[key] = []
    this.providers[key].push({ provider, merge: opts?.merge })
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
    if (entries.length === 0) delete this.providers[key]
  }

  /** Get the providers registered for a file extension. */
  get(ext: string): ProviderEntry[] | undefined {
    return this.providers[normalizeExtension(ext)]
  }
}
