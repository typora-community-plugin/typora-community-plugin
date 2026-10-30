/**
 * Helpers for whole-file negation scans.
 *
 * Kept separate from the AST analysis in `query-parser/negation.ts`: this file
 * only knows how to ask ripgrep "which files contain this literal pattern" and
 * which files can carry body text at all.
 */

/**
 * Build ripgrep arguments that list files containing a literal pattern.
 *
 * `-l` stops at the first match per file, so the output stays tiny even for
 * common words. Flags mirror the content search so that the two scans agree on
 * case sensitivity, whole-word mode, size limit and ignore rules.
 *
 * Why one process per pattern instead of a single scan with several `-e`:
 * ripgrep reports only the leftmost match (verified on 15.2.0):
 *
 *   "foobar only" + `-e foobar -e foo` → submatches=foobar   (foo invisible)
 *   "abcd"        + `-e abc -e bcd`    → submatches=abc      (bcd invisible)
 *
 * Ordering longer patterns first only fixes the prefix case, and `-l` exposes
 * no match text at all. A merged `--json` scan would have to drop `-m` and
 * re-test every pattern against every matched line, which turns the output
 * from one path per file into one record per matching line.
 */
export function buildFilesWithMatchesArgs(
  pattern: string,
  caseSensitive: boolean,
  wholeWord: boolean,
): string[] {
  const args: string[] = [
    "-l",
    "-F",
  ]
  if (!caseSensitive) args.push("-i")
  if (wholeWord) args.push("-w")
  args.push(
    "--max-filesize", "2M",
    "-g", "!.*",
    "--no-messages",
    "-e", pattern,
  )
  return args
}

/** Whether the file is a Markdown document (the only type with body text). */
export function isMarkdownFile(filePath: string): boolean {
  return /\.(md|markdown)$/i.test(filePath)
}
