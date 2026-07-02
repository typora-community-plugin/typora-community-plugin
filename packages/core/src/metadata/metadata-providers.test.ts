import { jest } from '@jest/globals'
import 'src/setup-test-env'
import { registerDefaultMetadataProviders, markdown } from './metadata-providers'
import type { MetadataManager, MetadataProvider } from './metadata-manager'

function createMockManager(): jest.Mocked<MetadataManager> {
  return {
    register: jest.fn(),
  } as any
}


describe('registerDefaultMetadataProviders', () => {

  it('should register the markdown provider for .md extension', () => {
    const mock = createMockManager()
    registerDefaultMetadataProviders(mock)

    expect(mock.register).toHaveBeenCalledWith('md', expect.any(Function))
    expect(mock.register).toHaveBeenCalledTimes(1)
  })

  it('should not register providers for other extensions', () => {
    const mock = createMockManager()
    registerDefaultMetadataProviders(mock)

    // Only 'md' is registered, verify count is exactly 1
    expect(mock.register).toHaveBeenCalledTimes(1)
  })
})


describe('markdown provider', () => {

  function createContext(filePath: string, content: string): Parameters<MetadataProvider>[0] {
    return {
      filePath,
      text: jest.fn().mockResolvedValue(content),
    } as any
  }

  it('should parse frontmatter and return frontmatter object', async () => {
    const ctx = createContext('/vault/test.md', `---
title: Test Title
tags: [tag1, tag2]
author: Test Author
---
Some content here`)

    const result = await markdown(ctx)

    expect(result.frontmatter).toEqual({
      title: 'Test Title',
      tags: ['tag1', 'tag2'],
      author: 'Test Author',
    })
  })

  it('should return frontmatter for YAML list-style tags', async () => {
    const ctx = createContext('/vault/test.md', `---
title: List Tags
tags:
  - tagA
  - tagB
  - nested/tag
---
body text`)

    const result = await markdown(ctx)

    expect(result.frontmatter.tags).toEqual(['tagA', 'tagB', 'nested/tag'])
  })

  it('should parse tags with positions from frontmatter', async () => {
    const ctx = createContext('/vault/test.md', `---
tags: [urgent, meeting]
---
body text`)

    const result = await markdown(ctx)

    expect(result.tags).toHaveLength(2)
    expect(result.tags[0].name).toBe('urgent')
    expect(result.tags[1].name).toBe('meeting')
    expect(result.tags[0]).toHaveProperty('lineText')
    expect(result.tags[0]).toHaveProperty('lineNumber')
  })

  it('should parse tags from single-line value', async () => {
    const ctx = createContext('/vault/test.md', `---
tags: standalone
---
body text`)

    const result = await markdown(ctx)

    expect(result.tags).toHaveLength(1)
    expect(result.tags[0].name).toBe('standalone')
  })

  it('should return empty tags when no tags key in frontmatter', async () => {
    const ctx = createContext('/vault/test.md', `---
title: No Tags
---
body text`)

    const result = await markdown(ctx)

    expect(result.tags).toEqual([])
  })

  it('should parse ATX headings as titles', async () => {
    const ctx = createContext('/vault/notes.md', `---
title: Note
---
# Main Title
## Section One
Some text here.
### Subsection A
More text.
## Section Two

`)

    const result = await markdown(ctx)

    expect(result.titles).toHaveLength(4)
    expect(result.titles[0].name).toBe('Main Title')
    expect(result.titles[0].lineText).toBe('# Main Title')
    expect(typeof result.titles[0].lineNumber).toBe('number')

    expect(result.titles[1].name).toBe('Section One')
    expect(result.titles[2].name).toBe('Subsection A')
    expect(result.titles[3].name).toBe('Section Two')
  })

  it('should return empty titles when no headings in content', async () => {
    const ctx = createContext('/vault/flat.md', `---
title: Flat
---
No headings here, just plain text.`)

    const result = await markdown(ctx)

    expect(result.titles).toEqual([])
  })

  it('should parse plain content (no frontmatter)', async () => {
    const ctx = createContext('/vault/plain.md', `# Hello World

Just plain markdown without YAML frontmatter.`)

    const result = await markdown(ctx)

    expect(result.frontmatter).toEqual({})
    expect(result.tags).toEqual([])
    expect(result.titles).toHaveLength(1)
    expect(result.titles[0].name).toBe('Hello World')
  })

  it('should not treat headings inside frontmatter as titles', async () => {
    const ctx = createContext('/vault/test.md', `---
title: # Not A Heading
---
# Real Heading`)

    const result = await markdown(ctx)

    expect(result.titles).toHaveLength(1)
    expect(result.titles[0].name).toBe('Real Heading')
  })

  it('should handle headers with special characters', async () => {
    const ctx = createContext('/vault/test.md', `---
title: Test
---
# Heading [with] (brackets) & "quotes"`)

    const result = await markdown(ctx)

    expect(result.titles).toHaveLength(1)
    expect(result.titles[0].name).toBe('Heading [with] (brackets) & "quotes"')
  })

  it('should return correct lineNumber (1-based, accounting for frontmatter removal)', async () => {
    const ctx = createContext('/vault/test.md', `---
title: Test
---
# First Heading at Line 6
## Second at Line 7`)

    const result = await markdown(ctx)

    expect(result.titles[0].lineNumber).toBeGreaterThanOrEqual(1)
    expect(result.titles[1].lineNumber).toBeGreaterThan(result.titles[0].lineNumber)
  })

  it('should return frontmatter as a Record of parsed values', async () => {
    const ctx = createContext('/vault/test.md', `---
count: 42
active: true
nested:
  key: value
items:
  - one
  - two
title: Types Test
---
content`)

    const result = await markdown(ctx)

    expect(result.frontmatter.count).toBe('42')
    expect(result.frontmatter.active).toBe('true')
    expect(typeof result.frontmatter.title).toBe('string')
  })


  it('should provide filePath in context', async () => {
    const ctx = createContext('/vault/deep/nested/file.md', `---
title: Deep File
---
content`)

    const result = await markdown(ctx)

    expect(result.frontmatter.title).toBe('Deep File')
  })
})
