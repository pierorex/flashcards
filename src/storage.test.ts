import { beforeEach, describe, expect, it } from 'vitest'
import { newCard } from './srs'
import { fromJSON, load, save } from './storage'

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

describe('fromJSON', () => {
  it('restores a backup written by export', () => {
    const cards = [newCard('好', 'hǎo', 'good')]
    expect(fromJSON(JSON.stringify(cards))).toEqual(cards)
  })

  it('refuses a file that is not a deck rather than wiping one', () => {
    expect(fromJSON('{ not json')).toBeNull()
    expect(fromJSON('{"cards":[]}')).toBeNull()
    expect(fromJSON('[{"foo":"bar"}]')).toBeNull()
  })

  it('accepts an empty deck file', () => {
    expect(fromJSON('[]')).toEqual([])
  })
})
