import { beforeEach, describe, expect, it } from 'vitest'
import { newCard } from './srs'
import { load, save } from './storage'

const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => void (store[k] = v),
  removeItem: (k: string) => void delete store[k],
  clear: () => void Object.keys(store).forEach((k) => delete store[k]),
  key: () => null,
  length: 0,
} as Storage

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips cards', () => {
    const cards = [newCard('好', 'hǎo', 'good')]
    save(cards)
    expect(load()).toEqual(cards)
  })

  it('starts empty on a fresh device', () => {
    expect(load()).toEqual([])
  })

  it('recovers with an empty deck instead of crashing on corrupt data', () => {
    localStorage.setItem('flashcards.v1', '{ not json')
    expect(load()).toEqual([])
  })
})
