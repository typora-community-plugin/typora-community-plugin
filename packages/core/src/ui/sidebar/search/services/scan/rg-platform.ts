/**
 * Platform and path differences of the ripgrep search backend.
 *
 * Centralizes everything that changes between win32/linux and macOS:
 * - macOS delegates global search to Typora's native engine (bridge handler),
 *   so no plugin-side ripgrep runs there.
 * - The ripgrep binary lives inside an asar archive in packaged builds.
 * - Ripgrep prints paths relative to its cwd; consumers want absolute paths.
 *
 * Pure helpers: no process management, no parsing.
 */
import { platform } from "src/common/constants"
import path from "src/path"


/** macOS delegates search to Typora's native engine; plugin-side scans are impossible. */
export function isNativeBridgePlatform(): boolean {
  return platform() === 'darwin'
}

/** Get the ripgrep binary path from vscode-ripgrep; null when unavailable. */
export function resolveRipgrepPath(): string | null {
  try {
    const rgModule = (globalThis as any).reqnode?.("vscode-ripgrep")
    if (!rgModule) return null

    // Handle both asar and non-asar paths
    const rgPath = ((rgModule as any).rgPath ?? "")
      .replace("node_modules.asar", "node_modules")
    return rgPath || null
  } catch {
    return null
  }
}

/** Require the child_process module from the Node side. */
export function requireChildProcess(): typeof import("child_process") {
  return (globalThis as any).reqnode?.("child_process") ?? require("child_process")
}

/**
 * Make a ripgrep-printed path absolute.
 *
 * Ripgrep outputs paths relative to its cwd (the vault folder); every raw
 * path it prints — match records, `--files` listings, `-l` listings — goes
 * through this single fix-up.
 */
export function toAbsolutePath(cwd: string, rawPath: string): string {
  return path.isAbsolute(rawPath)
    ? rawPath
    : path.join(cwd, rawPath)
}
