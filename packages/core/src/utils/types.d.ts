export type DisposeFunc = () => void

export type FileURL = { pathname: string, hash?: string }

export type ReadonlyDeep<T> = {
  readonly [P in keyof T]: T[P] extends object
  ? ReadonlyDeep<T[P]>
  : T[P];
}
