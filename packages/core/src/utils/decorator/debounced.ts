import { debounce } from "src/utils/schedule/debounce"


export function debounced(delay: number): MethodDecorator {
  return function (
    target,
    propertyKey,
    descriptor
  ) {
    const originalMethod = descriptor.value
    descriptor.value = debounce(originalMethod as any, delay)
  }
}
