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

export function review(
  card: Card,
  ok: boolean,
  now: number,
  practice = false,
): Card {
  if (!ok) return { ...card, box: 0, due: now, lapses: card.lapses + 1 }
  // Drilling a card that isn't due must not inflate its interval — cramming
  // would otherwise push a word 32 days out after one good afternoon.
  if (practice) return card
  const box = Math.min(card.box + 1, MAX_BOX)
  return { ...card, box, due: now + INTERVALS[box] * DAY }
}

/**
 * What to study right now: the due cards, or the whole deck as free practice
 * when nothing is due, so there is never a dead end.
 */
export function studySession(
  cards: Card[],
  now: number,
): { cards: Card[]; practice: boolean } {
  const due = dueCards(cards, now)
  if (due.length > 0) return { cards: due, practice: false }
  return { cards, practice: cards.length > 0 }
}

export function dueCards(cards: Card[], now: number): Card[] {
  return cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due)
}

/** Put a missed card back into the session queue, `gap` cards from now. */
export function requeue<T>(queue: T[], card: T, gap: number): T[] {
  const at = Math.min(gap, queue.length)
  return [...queue.slice(0, at), card, ...queue.slice(at)]
}
