// https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_capitalize
export function capitalize(text: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : ''
}
