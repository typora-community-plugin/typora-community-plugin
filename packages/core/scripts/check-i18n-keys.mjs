/**
 * i18n key 对齐校验
 *
 * `packages/core/src/locales` 随构建原样拷贝到 dist，多语言文件之间的 key 漂移
 * （缺失 / 多余 / 类型不一致 / 占位符不一致）在运行时不会被发现。
 * 本脚本以基准语言（默认 en，与 i18n.ts 的 defaultLang 一致）对比其余语言文件，
 * 发现漂移即退出码 1，供 CI 与本地 `pnpm run check:i18n` 使用。
 *
 * 用法:
 *   node scripts/check-i18n-keys.mjs [localeDir ...] [--base=<lang>] [--json]
 *     localeDir  默认 <pkg>/src/locales（相对本脚本解析，任意 cwd 可用）
 *     --base     基准语言，默认 en
 *     --json     以 JSON 输出结果（供工具消费）
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'


const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_LOCALE_DIRS = [path.join(PKG_ROOT, 'src', 'locales')]
const DEFAULT_BASE = 'en'

const PLACEHOLDER_RE = /\{\{?(\w+)\}?\}/g

const args = process.argv.slice(2)
const jsonOutput = args.includes('--json')
const baseArg = args.find(s => s.startsWith('--base='))
const base = baseArg ? baseArg.slice('--base='.length) : DEFAULT_BASE
const localeDirs = args.filter(s => !s.startsWith('--'))
  .length ? args.filter(s => !s.startsWith('--'))
  : DEFAULT_LOCALE_DIRS


/** 递归展开为 `dot/path` -> { type, placeholders } */
function flatten(obj, prefix = [], out = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const keyPath = [...prefix, key]
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out.set(keyPath.join('.'), { type: 'object', placeholders: null })
      flatten(value, keyPath, out)
    }
    else {
      const placeholders = typeof value === 'string'
        ? new Set([...value.matchAll(PLACEHOLDER_RE)].map(m => m[1]))
        : null
      out.set(keyPath.join('.'), {
        type: typeof value,
        placeholders,
        empty: value === '',
      })
    }
  }
  return out
}

function readLocale(file) {
  const text = fs.readFileSync(file, 'utf-8')
  return JSON.parse(text)
}

function checkDir(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => /^lang\..+\.json$/.test(f))
    .sort()

  const locales = files.map(f => ({
    name: f.slice('lang.'.length, -'.json'.length),
    file: path.join(dir, f),
  }))

  const baseLocale = locales.find(l => l.name === base)
  if (!baseLocale) {
    return { dir, fatal: `基准语言文件 lang.${base}.json 不存在` }
  }

  const parsed = new Map()
  for (const { name, file } of locales) {
    try {
      parsed.set(name, flatten(readLocale(file)))
    }
    catch (err) {
      return { dir, fatal: `${file} 解析失败: ${err.message}` }
    }
  }

  const baseKeys = parsed.get(base)
  const problems = []

  for (const { name } of locales) {
    if (name === base) continue
    const keys = parsed.get(name)
    const missing = [...baseKeys.keys()].filter(k => !keys.has(k))
    const extra = [...keys.keys()].filter(k => !baseKeys.has(k))
    const typeMismatch = []
    const placeholderMismatch = []
    const empty = []

    for (const [key, info] of keys) {
      const baseInfo = baseKeys.get(key)
      if (!baseInfo) continue
      if (info.type !== baseInfo.type) {
        typeMismatch.push({ key, base: baseInfo.type, current: info.type })
      }
      if (info.type === 'string' && baseInfo.type === 'string') {
        const a = baseInfo.placeholders
        const b = info.placeholders
        if (a.size !== b.size || [...a].some(p => !b.has(p))) {
          placeholderMismatch.push({
            key,
            base: [...a],
            current: [...b],
          })
        }
      }
      if (info.empty) empty.push(key)
    }

    problems.push({
      locale: name,
      missing,
      extra,
      typeMismatch,
      placeholderMismatch,
      empty,
    })
  }

  return { dir, base, locales: locales.map(l => l.name), problems }
}


const results = localeDirs.map(checkDir)

if (jsonOutput) {
  console.log(JSON.stringify(results, null, 2))
}
else {
  for (const r of results) {
    console.log(`\n[i18n] ${r.dir} (base: ${r.base ?? base})`)
    if (r.fatal) {
      console.error(`  ✗ ${r.fatal}`)
      continue
    }
    console.log(`  locales: ${r.locales.join(', ')}`)
    for (const p of r.problems) {
      const sections = []
      if (p.missing.length) {
        sections.push(`  ✗ [${p.locale}] 缺失 ${p.missing.length} 个 key:\n` +
          p.missing.map(k => `      - ${k}`).join('\n'))
      }
      if (p.extra.length) {
        sections.push(`  ✗ [${p.locale}] 多余 ${p.extra.length} 个 key:\n` +
          p.extra.map(k => `      + ${k}`).join('\n'))
      }
      if (p.typeMismatch.length) {
        sections.push(`  ✗ [${p.locale}] 类型不一致:\n` +
          p.typeMismatch.map(t => `      ~ ${t.key} (${base}: ${t.base} → ${t.current})`).join('\n'))
      }
      if (p.placeholderMismatch.length) {
        sections.push(`  ✗ [${p.locale}] 占位符不一致:\n` +
          p.placeholderMismatch.map(t =>
            `      ~ ${t.key} (base: {${t.base.join(', ')}} → {${t.current.join(', ')}})`,
          ).join('\n'))
      }
      if (p.empty.length) {
        sections.push(`  ⚠ [${p.locale}] 空字符串值:\n` +
          p.empty.map(k => `      ${k}`).join('\n'))
      }
      console.log(sections.length ? sections.join('\n') : `  ✓ [${p.locale}] 与 ${base} 对齐`)
    }
  }
}

const failed = results.some(r =>
  r.fatal
  || r.problems?.some(p =>
    p.missing.length
    || p.extra.length
    || p.typeMismatch.length
    || p.placeholderMismatch.length,
  ),
)

process.exit(failed ? 1 : 0)
