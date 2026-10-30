# Advanced search

Advanced search replaces Typora's native search with a query syntax that supports field prefixes (`tag:`, `title:`, `filename:`), boolean combinations, and exact phrases, so you can locate content across the whole vault.

## Preview

![advanced-search](../../assets/user/advanced-search.jpg)

## Prerequisite: enable the metadata index

Advanced search depends on the [Metadata (beta)](./3d-internal-plugins.md) core plugin, which is **disabled by default**. When it is not enabled, **all queries in advanced mode return no results**, with no error message.

1. Plugin Settings modal → Core Plugins → check "Metadata (beta)".
2. Wait for the `Indexing: completed/total` progress in the status bar to disappear.
3. Return to the search panel and enter your query.

## Enable Advanced Search mode

1. Click the **Search** icon in the [Ribbon](./4b-ribbon.md) to open the search panel.
2. **Above** the search box there is a row: the text on the left reads "Search" (it changes to "Advanced Search" when enabled), and on the right is the <button class="ty-plugin-advanced-search-btn" style="display:inline-block; padding: 2px 8px; border: 1px solid #999; border-radius: 3px; cursor: pointer;">✨</button> button.
3. Left-click the ✨ button to enable/disable it. When enabled, the row text changes to "Advanced Search" and the button is highlighted.
4. Hover over the "Advanced Search" text to see a syntax cheat sheet.

> This row is above the search box, not to its right; it is shown whether or not the mode is enabled.
>
> It is the same switch as Plugin Settings → [Appearance](./3b-appearance.md) → Search → "Advanced Search Mode".

When enabled, search behavior is handled by the custom engine and supports the syntax below; when disabled, it returns to Typora's native text matching.

## Query syntax

### Basic terms

Type a word or phrase directly; it scans all files in the vault:

```
hello world
```

Multiple words are implicitly **AND**-ed: results must contain all keywords (see "Notes and limitations" at the end).

Wrap text in double quotes for a contiguous phrase:

```
"exact phrase"
```

Inside quotes, matching is by **contiguous substring within a single line** and does not span lines.

### Field prefixes

| Prefix | Matched against | Example |
|------|----------|------|
| `tag:` | `tags` in frontmatter and inline `#tags` in the body | `tag:project` |
| `title:` | `title` in frontmatter and all `#` headings (H1–H6) in the body | `title:Meeting` |
| `filename:` | File name (including extension) | `filename:report` |

- Prefixes are case-insensitive; `Tag:`, `TAG:`, etc. all work.
- There **must be no space** after the colon: `tag: foo` is treated as plain text.
- Values cannot contain spaces or quotes; `title:"my heading"` does not work.

**Tag search**

| Query | Scope |
|------|------|
| `tag:foo` | Frontmatter tags and inline `#foo` in the body |
| `#foo` | Matched as plain text; only appears in the body |
| `tag:foo -#foo` | Excludes results where `#foo` appears on the same body line (see "Notes and limitations" at the end) |

Tags are matched **exactly**: `tag:foo` does not match `foobar` or `my-foo`; `tag:project` does not match `project/sub-task` either. Hierarchical tags require the full path:

```
tag:project/sub-task
```

> Writing `tag:#foo` cannot match inline tags in the body; omit the `#`.

### Boolean operators

**AND (implicit)**

```
meeting notes
```

**OR (explicit)**

`OR` must be **uppercase**; lowercase `or` is treated as a plain word:

```
book OR film
```

Parentheses group terms and adjust precedence:

```
(book OR film) tag:movies
```

(See "Notes and limitations" at the end for how `OR` inside parentheses actually behaves.)

**NOT (negation)**

Prefix a term or group with a minus sign:

```
tag:project -deprecated
(tag:work OR tag:personal) -(meeting OR call)
```

### Combined example

```
(book film) OR tag:game
```

Finds files that contain both `book` and `film`, or have the `game` tag.

## Result list

- Results are **grouped by file**, with matching lines listed under each file and matched fragments highlighted.
- The number on a file entry is the count of matching lines and is not guaranteed to equal the actual number of matches.
- A thin progress bar at the top of the panel indicates that a search is running; there is no text or percentage.
- The UI does not show a total result count and has no sorting options.

## Notes and limitations

The following describes how the current implementation actually behaves. Where it differs from the syntax description above, this section takes precedence:

1. **`OR` inside parentheses is executed as `AND`.** `(book OR film)` actually requires both; for "or", put `OR` at the top level, e.g. `book OR film tag:movies`.
2. **Negation only applies to lines already matched in the same file.** Exclusion conditions do not scan the whole document separately; content on other lines or outside the scanned range is not affected by `-term`.
3. **A query with only a negated term (e.g. `-foo`) does not return "files without foo".** With metadata enabled it may return the entire vault; always combine it with at least one positive keyword.
4. **`tag:foo -#tag` cannot be limited to "frontmatter only".** It only suppresses body tags that appear on the same line.
5. **`tag:#foo` does not work**; the `#` is not stripped. Write `tag:foo`.
6. **`title:` is case-sensitive**; `title:meeting` does not find `Meeting`. `filename:` is case-insensitive.
7. **Frontmatter tag matching is case-sensitive; inline body tags are not.**
8. **Regular expressions are not supported.** `/foo/` is searched as plain characters.
9. **Body search limits: 2 MiB per file, at most 10 matching lines returned per file.** Large files or files with too many matches may have missing results.
10. **Body search skips hidden files and files ignored by `.gitignore`**, but `filename:` and `title:` can still match them.
11. **Only Markdown and image files are indexed**; other file types are not matched by structured queries.
12. **There is no error message.** Syntax mistakes, disabled metadata, and engine errors all appear simply as "no results".
13. **On macOS, boolean and field semantics for body results do not apply** (body search uses Typora's native engine); only metadata-side `tag:`/`title:`/`filename:` are still handled by the plugin. Use Windows / Linux if you need the full syntax.

## Related pages

- [Core Plugins](./3d-internal-plugins.md)
- [Appearance](./3b-appearance.md)
- [Ribbon](./4b-ribbon.md)
