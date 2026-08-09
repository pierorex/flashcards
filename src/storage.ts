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
