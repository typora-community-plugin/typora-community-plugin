const DEFAULT_OPTS = {
  length: 30,
  omission: '...',
}

type TruncateOptions = Partial<typeof DEFAULT_OPTS>

export function truncate(string: string, options: TruncateOptions = DEFAULT_OPTS) {
  const opts = Object.assign({}, DEFAULT_OPTS, options)

  if (string.length <= opts.length) {
    return string
  }
  return string.slice(0, opts.length) + opts.omission
}
