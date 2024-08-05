export function constant<T>(value: T): () => T {
  return () => value
}
