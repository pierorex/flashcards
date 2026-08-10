import type { Card } from './srs'

const KEY = 'flashcards.v1'

/** Decks saved before stats existed have no counters; treat them as unseen. */
const migrate = (cards: Card[]): Card[] =>
  cards.map((c) => ({ ...c, seen: c.seen ?? 0, lastSeen: c.lastSeen ?? 0 }))

export function load(): Card[] {
  try {
    return migrate(JSON.parse(localStorage.getItem(KEY) ?? '[]'))
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
  return parsed.every(looksLikeCard) ? migrate(parsed as Card[]) : null
}
