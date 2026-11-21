import { execFile, execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'


export const installerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const distDir = path.join(installerDir, 'dist')
export const templatesDir = path.join(installerDir, 'templates')
export const fixturesDir = path.join(installerDir, 'test', 'fixtures')

const LOADER_TAG_RE = /<script\b[^>]*\bsrc\s*=\s*["'][^"']*plugins\/loader\.js["'][^>]*>\s*<\/script>/g

/** Every `<script src="...plugins/loader.js">` tag in the html. */
export function findLoaderTags(html) {
  return html.match(LOADER_TAG_RE) ?? []
}

/** The `src` of every loader tag, in document order. */
export function loaderSrcs(html) {
  return findLoaderTags(html).map(tag => /src\s*=\s*["']([^"']+)["']/.exec(tag)?.[1] ?? '')
}

export function hasUtf8Bom(buf) {
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
}

/** Convert a Windows path to the POSIX form used by Git Bash. */
export function toPosix(p) {
  if (process.platform !== 'win32') return p
  const s = p.replace(/\\/g, '/')
  const m = /^([A-Za-z]):\//.exec(s)
  return m ? `/${m[1].toLowerCase()}${s.slice(2)}` : s
}

function psQuote(s) {
  return `'${s.replace(/'/g, "''")}'`
}

async function makeSandbox() {
  const root = await mkdtemp(path.join(tmpdir(), 'typora-installer-test-'))
  const cleanup = () => rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  return { root, cleanup }
}

async function readFixture(fixtureName, { crlf = false } = {}) {
  let html = await readFile(path.join(fixturesDir, fixtureName), 'utf8')
  if (crlf) html = html.replace(/\r?\n/g, '\r\n')
  return html
}

/**
 * Sandbox shaped like a Windows Typora installation:
 *
 *   <root>/Typora/resources/app/window.html
 *   <root>/profile/.typora/community-plugins      (junction target)
 *   <root>/profile/AppData/Roaming/Typora         (junction parent)
 */
export async function makeWindowsSandbox(fixtureName, { crlf = false } = {}) {
  const { root, cleanup } = await makeSandbox()
  const typoraHome = path.join(root, 'Typora')
  const windowHtml = path.join(typoraHome, 'resources', 'app', 'window.html')
  await mkdir(path.dirname(windowHtml), { recursive: true })

  const originalHtml = await readFixture(fixtureName, { crlf })
  await writeFile(windowHtml, originalHtml)

  const profile = path.join(root, 'profile')
  const community = path.join(profile, '.typora', 'community-plugins')
  await mkdir(community, { recursive: true })
  await mkdir(path.join(profile, 'AppData', 'Roaming', 'Typora'), { recursive: true })

  return { root, cleanup, typoraHome, windowHtml, profile, community, originalHtml }
}

/**
 * Sandbox shaped like a Linux Typora installation. `HOME` is redirected into
 * the sandbox so `$HOME/.config/Typora` never points at the real user data.
 * `pluginSrc` is where the distributable scripts live (the installer copies
 * its own directory into `<HOME>/.config/Typora/plugins`).
 */
export async function makeLinuxSandbox(fixtureName, { crlf = false } = {}) {
  const { root, cleanup } = await makeSandbox()
  const home = path.join(root, 'home')
  const typoraHome = path.join(root, 'typora')
  const windowHtml = path.join(typoraHome, 'resources', 'app', 'window.html')
  await mkdir(path.dirname(windowHtml), { recursive: true })

  const originalHtml = await readFixture(fixtureName, { crlf })
  await writeFile(windowHtml, originalHtml)

  const pluginSrc = path.join(root, 'plugin-src')
  await mkdir(pluginSrc, { recursive: true })
  await cp(distDir, pluginSrc, { recursive: true })
  await writeFile(path.join(pluginSrc, 'loader.js'), 'window.typoraPlugin = {}\n')

  await mkdir(home, { recursive: true })

  const userdataPath = path.join(home, '.config', 'Typora')
  const pluginsPath = path.join(userdataPath, 'plugins')

  return { root, cleanup, home, typoraHome, windowHtml, pluginSrc, userdataPath, pluginsPath, originalHtml }
}

function findPwsh() {
  const candidates = process.platform === 'win32' ? ['pwsh', 'powershell'] : ['pwsh']
  for (const cmd of candidates) {
    try {
      execFileSync(cmd, ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'], {
        stdio: 'ignore',
        timeout: 20000,
        windowsHide: true,
      })
      return cmd
    } catch {
      // try the next candidate
    }
  }
  return null
}

function findBash() {
  const candidates = []
  if (process.platform === 'win32') {
    // Prefer Git Bash over WSL's `bash`, which cannot see Windows paths.
    candidates.push(
      path.join(process.env.USERPROFILE ?? '', 'scoop', 'apps', 'git', 'current', 'bin', 'bash.exe'),
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
      'bash',
    )
  } else {
    candidates.push('bash')
  }

  for (const cmd of candidates) {
    try {
      execFileSync(cmd, ['-c', 'echo ok'], { stdio: 'ignore', timeout: 20000 })
      return cmd
    } catch {
      // try the next candidate
    }
  }
  return null
}

/** Detected once; `null` when the shell is unavailable (tests get skipped). */
export const pwsh = findPwsh()
/** Detected once; `null` when the shell is unavailable (tests get skipped). */
export const bash = findBash()

function exec(command, args, { env = {}, cwd = installerDir, timeout = 120000 } = {}) {
  return new Promise(resolve => {
    execFile(
      command,
      args,
      {
        cwd,
        env: { ...process.env, ...env },
        encoding: 'utf8',
        windowsHide: true,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        // No stdin: interactive prompts must fail fast instead of hanging.
        stdio: ['ignore', 'pipe', 'pipe'],
      },
      (error, stdout, stderr) => {
        const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0
        resolve({ exitCode, stdout, stderr, error })
      },
    )
  })
}

/**
 * Run a `dist/*.ps1` script against a sandbox, with the interactive parts
 * stubbed out:
 *   - `Read-Host`      -> always "Y"       (find-home.ps1 confirmation prompt)
 *   - `Get-Process`    -> empty            (check-process.ps1 would see the dev's Typora)
 *   - `[Console]::ReadKey` throws under -NonInteractive; the trailing exception
 *     is swallowed so a successful run still exits 0.
 */
export async function runWindowsScript(scriptPath, { typoraHome, profile }) {
  const command = [
    '$ErrorActionPreference = "Continue"',
    'function Read-Host { param([string]$Prompt) "Y" }',
    'function Get-Process { [CmdletBinding()] param([string]$Name) $null }',
    `try { . ${psQuote(scriptPath)} -Path ${psQuote(typoraHome)} } catch { Write-Output ("__HARNESS_CAUGHT__ " + $_.Exception.GetType().Name) }`,
  ].join('\n')

  return exec(pwsh, ['-NoProfile', '-NonInteractive', '-Command', command], {
    env: { USERPROFILE: profile },
  })
}

/** Run a `dist/*.sh` script with `HOME` redirected into the sandbox. */
export async function runBashScript(scriptPath, args, { home }) {
  return exec(bash, [toPosix(scriptPath), ...args], {
    env: { HOME: toPosix(home) },
  })
}
