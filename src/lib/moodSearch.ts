// src/lib/moodSearch.ts
// Mood search: turn a plain sentence into tags with a keyword table.
// A language model can replace matchTags(): send it the sentence and the tag list, get tags back.
const table: Record<string, string[]> = {
  slow: ['tag-one'], gentle: ['tag-one'], relaxed: ['tag-one', 'tag-four'], calm: ['tag-four'], quiet: ['tag-four'],
  fun: ['tag-two'], playful: ['tag-two', 'tag-five'], light: ['tag-five'], laugh: ['tag-two'],
  intense: ['tag-three'], fast: ['tag-three', 'tag-six'], energetic: ['tag-six'],
  romantic: ['tag-seven'], couple: ['tag-seven'], tender: ['tag-seven'], date: ['tag-seven'],
  new: ['tag-eight'], different: ['tag-eight'], curious: ['tag-eight'], surprise: ['tag-eight'],
}

export function matchTags(sentence: string, allTags: string[]) {
  const words = sentence.toLowerCase().match(/[a-z0-9-]+/g) ?? []
  const hits = words.flatMap((w) => [...(table[w] ?? []), ...allTags.filter((t) => t === w || t === `tag-${w}`)])
  return [...new Set(hits)].filter((t) => allTags.includes(t))
}
