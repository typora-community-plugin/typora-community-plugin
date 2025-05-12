
export function html(strings: TemplateStringsArray, ...values: any[]) {
  const htmlStr = strings.reduce((htmlStr, str, i) => {
    return htmlStr + values[i - 1] + str
  })

  return $(htmlStr).get(0)!
}

export function getChildIndex(element: HTMLElement) {
  const parent = element.parentNode;
  return Array.from(parent.children).indexOf(element);
}
