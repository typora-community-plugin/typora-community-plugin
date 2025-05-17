
export function html(strings: TemplateStringsArray, ...values: any[]) {
  const htmlStr = strings.reduce((htmlStr, str, i) => {
    return htmlStr + values[i - 1] + str
  })

  return $(htmlStr).get(0)!
}

export function getElementPagePosition(element: HTMLElement) {
  let left = 0
  let top = 0
  while (element) {
    left += element.offsetLeft
    top += element.offsetTop
    element = element.offsetParent as HTMLElement
  }
  return { left, top }
}
