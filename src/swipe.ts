/** Movement before we decide whose gesture this is. */
export const SLOP = 10

/**
 * Is this drag a back gesture? Judged from the first few pixels, because a
 * thumb swipe arcs downward — by the end of it the vertical component can
 * easily win, even though the intent was plainly sideways.
 *
 * Rightward is left alone: that is the OS edge gesture.
 */
export function isBackDrag(dx: number, dy: number): boolean {
  return dx < 0 && Math.abs(dx) > Math.abs(dy)
}

/** Far enough to mean it: 30% of the screen, capped so big phones stay easy. */
export function shouldCommit(dx: number, width: number): boolean {
  return dx <= -Math.min(120, width * 0.3)
}
