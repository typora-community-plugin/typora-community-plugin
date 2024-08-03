const DEFAULT_OPTS = {
  length: 30,
  omission: '...',
}

type TruncateOptions = Partial<typeof DEFAULT_OPTS>

export function truncate(string: string, options: TruncateOptions = DEFAULT_OPTS) {

  if (typeof options !== 'object') {
    throw new TypeError('`truncate()`\'s argument `options` must be an object.')
  }

  const opts = Object.assign({}, DEFAULT_OPTS, options)
  if (typeof opts.length !== 'number') {
    throw new TypeError('`truncate()`\'s argument `options.length` must be a number.')
  }

  if (string.length <= opts.length) {
    return string
  }

  const omission = opts.omission.toString()
  if (opts.length <= omission.length) {
    return omission
  }
  return string.slice(0, opts.length - omission.length) + omission
}
