import { describe, expect, it } from 'vitest'
import { isBackSwipe } from './swipe'

const from = { x: 300, y: 400 }

describe('isBackSwipe', () => {
  it('accepts a clear leftward swipe', () => {
    expect(isBackSwipe(from, { x: 200, y: 405 })).toBe(true)
  })

  it('ignores a swipe too short to be deliberate', () => {
    expect(isBackSwipe(from, { x: 265, y: 400 })).toBe(false)
  })

  it('ignores a rightward swipe, which is the OS back gesture', () => {
    expect(isBackSwipe(from, { x: 400, y: 400 })).toBe(false)
  })

  it('ignores a vertical swipe, so scrolling still scrolls', () => {
    expect(isBackSwipe(from, { x: 300, y: 200 })).toBe(false)
    expect(isBackSwipe(from, { x: 295, y: 600 })).toBe(false)
  })

  it('ignores a mostly-vertical diagonal', () => {
    expect(isBackSwipe(from, { x: 220, y: 200 })).toBe(false)
  })

  it('accepts a mostly-horizontal diagonal', () => {
    expect(isBackSwipe(from, { x: 180, y: 440 })).toBe(true)
  })

  it('ignores a tap that does not move', () => {
    expect(isBackSwipe(from, from)).toBe(false)
  })
})
