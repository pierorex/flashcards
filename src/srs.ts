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
  /** Marked as suspect — something about the word itself needs a look. */
  flagged?: boolean
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

/**
 * How well it went. `easy` skips a box so obvious words stop eating reviews —
 * the cheap version of an SM-2 ease factor.
 */
export type Grade = 'again' | 'good' | 'easy'

export function review(
  card: Card,
  grade: Grade,
  now: number,
  practice = false,
): Card {
  const sighting = { ...card, seen: card.seen + 1, lastSeen: now }
  if (grade === 'again') {
    return { ...sighting, box: 0, due: now, lapses: card.lapses + 1 }
  }
  // Drilling a card that isn't due must not inflate its interval — cramming
  // would otherwise push a word 32 days out after one good afternoon.
  if (practice) return sighting
  const box = Math.min(card.box + (grade === 'easy' ? 2 : 1), MAX_BOX)
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
    cards: [...pick].sort(byStruggle).slice(0, cap),
    practice: due.length === 0 && cards.length > 0,
    due: due.length,
  }
}

export function dueCards(cards: Card[], now: number): Card[] {
  return cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due)
}

export const toggleFlag = (card: Card): Card => ({
  ...card,
  flagged: !card.flagged,
})

/**
 * How long to leave for a guess before the answer is spoken. A longer phrase is
 * more to recall, so it earns more silence — counted in hanzi, so punctuation
 * buys nothing.
 */
export function thinkTime(hanzi: string, base = 1000, per = 200): number {
  const chars = hanzi.match(/\p{Script=Han}/gu)?.length ?? 1
  return base + per * Math.max(0, chars - 1)
}

/** Autopilot counts forward forever; the list wraps under it. */
export const loopAt = <T>(items: T[], pos: number): T =>
  items[pos % items.length]

/** Rewind the loop, clamped so it cannot run off the front. */
export const stepBack = (pos: number, n = 1): number => Math.max(0, pos - n)

/** Forget everything learned about a word, keeping the word. */
export const resetProgress = (card: Card): Card => ({
  ...newCard(card.hanzi, card.pinyin, card.english),
  id: card.id,
  flagged: card.flagged, // a flag is a note about the word, not progress
})

/** How badly a word is going, 0 (solid) to 1 (always wrong). */
export const failRate = (card: Card): number =>
  card.seen > 0 ? card.lapses / card.seen : 0.5 // never seen is a coin flip

/** Worst first: hardest words while you are still fresh. */
const byStruggle = (a: Card, b: Card): number =>
  failRate(b) - failRate(a) || b.lapses - a.lapses || a.box - b.box

/** The n words you struggle with most — worst first. */
export function worstWords(cards: Card[], n: number): Card[] {
  return [...cards].sort(byStruggle).slice(0, n)
}

/** Tone marks are painful to type on a phone, so "ni hao" finds "nǐ hǎo". */
const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()

export const matchesQuery = (card: Card, query: string): boolean =>
  fold(`${card.hanzi} ${card.pinyin} ${card.english}`).includes(
    fold(query.trim()),
  )

/** Put a missed card back into the session queue, `gap` cards from now. */
export function requeue<T>(queue: T[], card: T, gap: number): T[] {
  const at = Math.min(gap, queue.length)
  return [...queue.slice(0, at), card, ...queue.slice(at)]
}
