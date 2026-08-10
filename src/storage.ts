import type { Card } from './srs'

const KEY = 'flashcards.v1'

export function load(): Card[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return [] // corrupt data beats a white screen; export is the real backup
  }
}

export function save(cards: Card[]): void {
  localStorage.setItem(KEY, JSON.stringify(cards))
}

/** Read a backup file. Returns null if it isn't a deck — never a partial one. */
export function fromJSON(text: string): Card[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null
  const looksLikeCard = (c: unknown) =>
    typeof c === 'object' && c !== null && 'hanzi' in c && 'english' in c
  return parsed.every(looksLikeCard) ? (parsed as Card[]) : null
}
