import { describe, expect, it } from 'vitest'
import { SLOP, isBackDrag, shouldCommit } from './swipe'

describe('isBackDrag', () => {
  // Direction is judged in the first few pixels, before a thumb arc curves.
  it('accepts a rightward start, the way iOS goes back', () => {
    expect(isBackDrag(12, 0)).toBe(true)
    expect(isBackDrag(12, 4)).toBe(true)
  })

  it('rejects a leftward start', () => {
    expect(isBackDrag(-12, 0)).toBe(false)
  })

  it('rejects a vertical start so scrolling still scrolls', () => {
    expect(isBackDrag(4, 20)).toBe(false)
    expect(isBackDrag(0, -20)).toBe(false)
  })

  it('rejects a tie rather than stealing an ambiguous gesture', () => {
    expect(isBackDrag(10, 10)).toBe(false)
  })

  it('is forgiving of an arcing thumb once it starts horizontal', () => {
    expect(isBackDrag(30, 25)).toBe(true)
  })

  it('has a slop small enough to feel immediate', () => {
    expect(SLOP).toBeLessThanOrEqual(12)
  })
})

describe('shouldCommit', () => {
  const phone = 375

  it('commits once dragged far enough to be deliberate', () => {
    expect(shouldCommit(140, phone)).toBe(true)
  })

  it('snaps back on a small drag', () => {
    expect(shouldCommit(40, phone)).toBe(false)
    expect(shouldCommit(100, phone)).toBe(false)
  })

  it('never commits on a leftward drag', () => {
    expect(shouldCommit(-200, phone)).toBe(false)
    expect(shouldCommit(0, phone)).toBe(false)
  })

  it('scales with the screen but stays reachable on a big phone', () => {
    expect(shouldCommit(130, 1024)).toBe(true) // cap, not 30% of 1024
  })

  it('asks for less travel on a narrow screen than the cap', () => {
    expect(shouldCommit(100, 300)).toBe(true) // 30% of 300 = 90
  })
})
