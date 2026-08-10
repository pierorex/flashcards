export type Point = { x: number; y: number }

/** Far enough that it cannot be a stray finger movement during a tap. */
const MIN_DISTANCE = 60

/**
 * A leftward drag means "go back". Rightward is left alone: that is the OS
 * edge gesture, and fighting it would break the phone's own navigation.
 */
export function isBackSwipe(start: Point, end: Point): boolean {
  const dx = end.x - start.x
  const dy = end.y - start.y
  // Mostly horizontal, so vertical scrolling never counts as a swipe.
  return dx <= -MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5
}
