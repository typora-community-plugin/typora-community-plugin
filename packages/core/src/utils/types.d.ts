export type DisposeFunc = () => void

export type ReadonlyDeep<T> = {
  readonly [P in keyof T]: T[P] extends object
  ? ReadonlyDeep<T[P]>
  : T[P];
}
