export function format(template: string, dict: Record<string, any>) {
  return template.replace(/\{([^}]+)\}/g, (_, name) => {
    return dict[name] ?? _
  })
}
