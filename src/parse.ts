export type Row = { hanzi: string; pinyin: string; english: string }

/**
 * Parse pasted lines of `汉字, pinyin, english` (tabs or commas) into words.
 * Two fields means hanzi + english; the meaning keeps any commas it contains.
 * Lines without a meaning, and words already known, are skipped.
 */
export function parseWords(text: string, existing: string[] = []): Row[] {
  const seen = new Set(existing)
  const rows: Row[] = []

  for (const line of text.split('\n')) {
    const fields = line.includes('\t') ? line.split('\t') : line.split(',')
    const [hanzi, ...rest] = fields.map((f) => f.trim())
    if (!hanzi || rest.length === 0 || seen.has(hanzi)) continue

    // Everything after the pinyin is meaning, so "good, well, fine" survives.
    const [pinyin, english] =
      rest.length === 1 ? ['', rest[0]] : [rest[0], rest.slice(1).join(', ')]
    if (!english) continue

    seen.add(hanzi)
    rows.push({ hanzi, pinyin, english })
  }

  return rows
}
