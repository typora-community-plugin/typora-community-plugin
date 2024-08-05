import { debounce } from "src/utils/function/debounce"


export function debounced(delay: number): MethodDecorator {
  return function (
    target: new (...args: any[]) => any,
    propertyKey,
    descriptor
  ) {
    const originalMethod = descriptor.value
    descriptor.value = debounce(originalMethod as any, delay)
  }
}
