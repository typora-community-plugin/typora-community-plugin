import { EditorSuggest } from "./suggest"


export abstract class TextSuggest extends EditorSuggest<string> {

  getSuggestions(query: string) {
    if (!query) return this.suggestions

    query = query.toLowerCase()
    const cache: Record<string, number> = {}
    return this.suggestions
      .filter(n => {
        cache[n] = n.toLowerCase().indexOf(query)
        return cache[n] !== -1
      })
      .sort((a, b) => cache[a] - cache[b] || a.length - b.length)
  }
}
