import { describe, expect, it } from 'vitest'
import {
  DAY,
  dueCards,
  newCard,
  requeue,
  review,
  studySession,
  worstWords,
} from './srs'

const now = Date.UTC(2026, 0, 1)

describe('review tracking', () => {
  it('counts every sighting and remembers when', () => {
    let c = newCard('好', 'hǎo', 'good')
    expect([c.seen, c.lastSeen]).toEqual([0, 0])
    c = review(c, true, now)
    c = review(c, false, now + 1000)
    expect(c.seen).toBe(2)
    expect(c.lastSeen).toBe(now + 1000)
  })

  it('counts sightings during practice too', () => {
    const c = review(newCard('好', 'hǎo', 'good'), true, now, true)
    expect(c.seen).toBe(1)
    expect(c.lastSeen).toBe(now)
  })
})

describe('review', () => {
  it('promotes a correct card and pushes its due date out', () => {
    const c = review(newCard('好', 'hǎo', 'good'), true, now)
    expect(c.box).toBe(1)
    expect(c.due).toBe(now + DAY)
  })

  it('grows the interval with each consecutive correct answer', () => {
    let c = newCard('好', 'hǎo', 'good')
    const gaps: number[] = []
    for (let i = 0; i < 5; i++) {
      const prev = c
      c = review(c, true, now)
      gaps.push(c.due - now)
      expect(c.box).toBe(prev.box + 1)
    }
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b))
    expect(new Set(gaps).size).toBe(gaps.length)
  })

  it('caps the box so intervals stop growing forever', () => {
    let c = newCard('好', 'hǎo', 'good')
    for (let i = 0; i < 20; i++) c = review(c, true, now)
    const capped = review(c, true, now)
    expect(capped.box).toBe(c.box)
    expect(capped.due).toBe(c.due)
  })

  it('resets a failed card to due now and counts the lapse', () => {
    let c = newCard('好', 'hǎo', 'good')
    for (let i = 0; i < 3; i++) c = review(c, true, now)
    const failed = review(c, false, now)
    expect(failed.box).toBe(0)
    expect(failed.due).toBe(now)
    expect(failed.lapses).toBe(1)
  })

  it('does not mutate the card it is given', () => {
    const c = newCard('好', 'hǎo', 'good')
    review(c, true, now)
    expect(c.box).toBe(0)
    expect(c.due).toBe(0)
  })
})

describe('dueCards', () => {
  it('returns only cards due at or before now, soonest first', () => {
    const a = { ...newCard('a', 'a', 'a'), due: now - DAY }
    const b = { ...newCard('b', 'b', 'b'), due: now }
    const later = { ...newCard('c', 'c', 'c'), due: now + DAY }
    expect(dueCards([later, b, a], now)).toEqual([a, b])
  })

  it('treats a brand new card as due immediately', () => {
    const fresh = newCard('新', 'xīn', 'new')
    expect(dueCards([fresh], now)).toEqual([fresh])
  })
})

describe('studySession', () => {
  it('studies the due cards when there are any', () => {
    const due = { ...newCard('a', 'a', 'a'), due: now }
    const later = { ...newCard('b', 'b', 'b'), due: now + DAY }
    expect(studySession([due, later], now)).toEqual({
      cards: [due],
      practice: false,
      due: 1,
    })
  })

  it('falls back to the whole deck as practice when nothing is due', () => {
    const later = { ...newCard('b', 'b', 'b'), due: now + DAY }
    expect(studySession([later], now)).toEqual({
      cards: [later],
      practice: true,
      due: 0,
    })
  })

  it('reports zero still due when the fallback deck is what is on offer', () => {
    const later = { ...newCard('b', 'b', 'b'), due: now + DAY }
    expect(studySession([later], now).due).toBe(0)
  })

  it('reports the full due count even when the session is capped', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      newCard(String(i), '', String(i)),
    )
    expect(studySession(many, now, 20).due).toBe(50)
  })

  it('has nothing to study with an empty deck', () => {
    expect(studySession([], now)).toEqual({
      cards: [],
      practice: false,
      due: 0,
    })
  })

  it('caps a session so a big backlog is not one endless slog', () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      newCard(String(i), '', String(i)),
    )
    expect(studySession(many, now, 20).cards).toHaveLength(20)
  })

  it('caps free practice too', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      ...newCard(String(i), '', String(i)),
      due: now + DAY,
    }))
    const session = studySession(many, now, 20)
    expect(session.practice).toBe(true)
    expect(session.cards).toHaveLength(20)
  })
})

describe('practice review', () => {
  it('never promotes a card past its real schedule', () => {
    let c = review(newCard('好', 'hǎo', 'good'), true, now)
    const { box, due } = c
    for (let i = 0; i < 5; i++) c = review(c, true, now, true)
    expect({ box: c.box, due: c.due }).toEqual({ box, due })
  })

  it('still demotes a card that gets missed during practice', () => {
    const c = review(newCard('好', 'hǎo', 'good'), true, now)
    expect(review(c, false, now, true).box).toBe(0)
  })
})

describe('worstWords', () => {
  const card = (hanzi: string, seen: number, lapses: number, box = 0) => ({
    ...newCard(hanzi, '', hanzi),
    seen,
    lapses,
    box,
  })

  it('puts the word you fail most often first', () => {
    const solid = card('solid', 10, 0, 4)
    const shaky = card('shaky', 10, 5)
    const awful = card('awful', 10, 9)
    expect(worstWords([solid, shaky, awful], 3).map((c) => c.hanzi)).toEqual([
      'awful',
      'shaky',
      'solid',
    ])
  })

  it('ranks by failure rate, not raw failure count', () => {
    const grind = card('grind', 100, 20) // 20% — seen a lot, mostly fine
    const rare = card('rare', 4, 3) // 75% — barely seen, mostly wrong
    expect(worstWords([grind, rare], 2)[0].hanzi).toBe('rare')
  })

  it('returns at most n words', () => {
    const deck = [card('a', 5, 4), card('b', 5, 3), card('c', 5, 2)]
    expect(worstWords(deck, 2)).toHaveLength(2)
  })

  it('ranks unseen words above ones already mastered', () => {
    const mastered = card('mastered', 20, 0, 6)
    const unseen = card('unseen', 0, 0)
    expect(worstWords([mastered, unseen], 2)[0].hanzi).toBe('unseen')
  })

  it('has nothing to drill in an empty deck', () => {
    expect(worstWords([], 5)).toEqual([])
  })
})

describe('requeue', () => {
  it('reinserts a missed card a few cards later in the session', () => {
    expect(requeue(['b', 'c', 'd', 'e'], 'a', 3)).toEqual(['b', 'c', 'd', 'a', 'e'])
  })

  it('puts the card last when the queue is shorter than the gap', () => {
    expect(requeue(['b'], 'a', 3)).toEqual(['b', 'a'])
  })

  it('still reinserts when it is the only card left', () => {
    expect(requeue([], 'a', 3)).toEqual(['a'])
  })
})
