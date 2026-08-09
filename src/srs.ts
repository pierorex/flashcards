export const DAY = 86_400_000

/** Leitner intervals in days, indexed by box. Box 0 = due today. */
const INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64]
const MAX_BOX = INTERVALS.length - 1

export type Card = {
  id: string
  hanzi: string
  pinyin: string
  english: string
  box: number
  due: number
  lapses: number
}

export function newCard(hanzi: string, pinyin: string, english: string): Card {
  return {
    id: crypto.randomUUID(),
    hanzi,
    pinyin,
    english,
    box: 0,
    due: 0, // epoch 0 = due forever ago, i.e. show it now
    lapses: 0,
  }
}

export function review(card: Card, ok: boolean, now: number): Card {
  if (!ok) return { ...card, box: 0, due: now, lapses: card.lapses + 1 }
  const box = Math.min(card.box + 1, MAX_BOX)
  return { ...card, box, due: now + INTERVALS[box] * DAY }
}

export function dueCards(cards: Card[], now: number): Card[] {
  return cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due)
}

/** Put a missed card back into the session queue, `gap` cards from now. */
export function requeue<T>(queue: T[], card: T, gap: number): T[] {
  const at = Math.min(gap, queue.length)
  return [...queue.slice(0, at), card, ...queue.slice(at)]
}
