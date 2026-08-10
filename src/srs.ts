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
  seen: number
  lastSeen: number
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
    seen: 0,
    lastSeen: 0,
  }
}

export function review(
  card: Card,
  ok: boolean,
  now: number,
  practice = false,
): Card {
  const sighting = { ...card, seen: card.seen + 1, lastSeen: now }
  if (!ok) {
    return { ...sighting, box: 0, due: now, lapses: card.lapses + 1 }
  }
  // Drilling a card that isn't due must not inflate its interval — cramming
  // would otherwise push a word 32 days out after one good afternoon.
  if (practice) return sighting
  const box = Math.min(card.box + 1, MAX_BOX)
  return { ...sighting, box, due: now + INTERVALS[box] * DAY }
}

/**
 * What to study right now: the due cards, or the whole deck as free practice
 * when nothing is due, so there is never a dead end. `due` is the real backlog
 * — never the practice fallback — so callers can say "N more due" honestly.
 */
export function studySession(
  cards: Card[],
  now: number,
  cap = Infinity,
): { cards: Card[]; practice: boolean; due: number } {
  const due = dueCards(cards, now)
  const pick = due.length > 0 ? due : cards
  return {
    cards: pick.slice(0, cap),
    practice: due.length === 0 && cards.length > 0,
    due: due.length,
  }
}

export function dueCards(cards: Card[], now: number): Card[] {
  return cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due)
}

/** How badly a word is going, 0 (solid) to 1 (always wrong). */
export const failRate = (card: Card): number =>
  card.seen > 0 ? card.lapses / card.seen : 0.5 // never seen is a coin flip

/** The n words you struggle with most — worst first. */
export function worstWords(cards: Card[], n: number): Card[] {
  return [...cards]
    .sort(
      (a, b) =>
        failRate(b) - failRate(a) ||
        b.lapses - a.lapses ||
        a.box - b.box,
    )
    .slice(0, n)
}

/** Put a missed card back into the session queue, `gap` cards from now. */
export function requeue<T>(queue: T[], card: T, gap: number): T[] {
  const at = Math.min(gap, queue.length)
  return [...queue.slice(0, at), card, ...queue.slice(at)]
}
