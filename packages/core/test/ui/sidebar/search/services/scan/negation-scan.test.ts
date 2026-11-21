/**
 * Whole-file negation scan helpers: ripgrep arguments and file-type checks.
 */

import { describe, it, expect } from '@jest/globals'

import {
  buildFilesWithMatchesArgs,
  isMarkdownFile,
} from 'src/ui/sidebar/search/services/scan/negation-scan'

describe('buildFilesWithMatchesArgs', () => {

  it('lists files with a fixed pattern, case-insensitively by default', () => {
    const args = buildFilesWithMatchesArgs('foo', false, false)
    expect(args).toContain('-l')
    expect(args).toContain('-F')
    expect(args).toContain('-i')
    expect(args).not.toContain('-w')
    expect(args.slice(-2)).toEqual(['-e', 'foo'])
    expect(args).toContain('2M')
  })

  it('drops -i in case-sensitive mode and adds -w for whole words', () => {
    const args = buildFilesWithMatchesArgs('Foo', true, true)
    expect(args).not.toContain('-i')
    expect(args).toContain('-w')
    expect(args.slice(-2)).toEqual(['-e', 'Foo'])
  })
})

describe('isMarkdownFile', () => {

  it('accepts .md and .markdown in any case', () => {
    expect(isMarkdownFile('/vault/a.md')).toBe(true)
    expect(isMarkdownFile('/vault/a.MD')).toBe(true)
    expect(isMarkdownFile('C:\\vault\\a.markdown')).toBe(true)
  })

  it('rejects other file types', () => {
    expect(isMarkdownFile('/vault/a.png')).toBe(false)
    expect(isMarkdownFile('/vault/a.mdx')).toBe(false)
    expect(isMarkdownFile('/vault/md')).toBe(false)
  })
})
