import type { Card } from './srs'

export type Row = { hanzi: string; pinyin: string; english: string }

/**
 * Parse pasted lines of `汉字, pinyin, english` (tabs or commas) into words.
 * Two fields means hanzi + english; the meaning keeps any commas it contains.
 * Lines without a meaning are skipped. Duplicates are splitNew's job.
 */
export function parseWords(text: string): Row[] {
  const rows: Row[] = []

  for (const line of text.split('\n')) {
    const fields = line.includes('\t') ? line.split('\t') : line.split(',')
    const [hanzi, ...rest] = fields.map((f) => f.trim())
    if (!hanzi || rest.length === 0) continue

    // Everything after the pinyin is meaning, so "good, well, fine" survives.
    const [pinyin, english] =
      rest.length === 1 ? ['', rest[0]] : [rest[0], rest.slice(1).join(', ')]
    if (!english) continue

    rows.push({ hanzi, pinyin, english })
  }

  return rows
}

/**
 * Sort incoming words into ones to add and ones already known, so a re-pasted
 * list is safe and you still get told what was left out. The hanzi is the
 * identity: same character, same word, whatever the meaning says.
 */
export function splitNew(
  rows: Row[],
  existing: string[],
): { add: Row[]; skipped: Row[] } {
  const seen = new Set(existing)
  const add: Row[] = []
  const skipped: Row[] = []

  for (const row of rows) {
    if (seen.has(row.hanzi)) {
      skipped.push(row)
    } else {
      seen.add(row.hanzi) // a repeat later in the same batch is a duplicate too
      add.push(row)
    }
  }

  return { add, skipped }
}

/**
 * Replace the text of words already in the deck, keeping their progress —
 * fixing a translation must not cost you the scheduling history. A blank
 * pinyin means "unchanged" rather than "erase it".
 */
export function overwrite(cards: Card[], rows: Row[]): Card[] {
  const byHanzi = new Map(rows.map((r) => [r.hanzi, r]))
  return cards.map((card) => {
    const row = byHanzi.get(card.hanzi)
    if (!row) return card
    return {
      ...card,
      pinyin: row.pinyin || card.pinyin,
      english: row.english,
    }
  })
}
