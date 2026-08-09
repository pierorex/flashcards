import { describe, expect, it } from 'vitest'
import { DAY, dueCards, newCard, requeue, review, studySession } from './srs'

const now = Date.UTC(2026, 0, 1)

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
    })
  })

  it('falls back to the whole deck as practice when nothing is due', () => {
    const later = { ...newCard('b', 'b', 'b'), due: now + DAY }
    expect(studySession([later], now)).toEqual({
      cards: [later],
      practice: true,
    })
  })

  it('has nothing to study with an empty deck', () => {
    expect(studySession([], now)).toEqual({ cards: [], practice: false })
  })
})

describe('practice review', () => {
  it('never promotes a card past its real schedule', () => {
    let c = review(newCard('好', 'hǎo', 'good'), true, now)
    const scheduled = c
    for (let i = 0; i < 5; i++) c = review(c, true, now, true)
    expect(c).toEqual(scheduled)
  })

  it('still demotes a card that gets missed during practice', () => {
    const c = review(newCard('好', 'hǎo', 'good'), true, now)
    expect(review(c, false, now, true).box).toBe(0)
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
