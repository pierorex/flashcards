import { describe, expect, it } from 'vitest'
import { overwrite, parseWords, splitNew } from './parse'
import { newCard, review } from './srs'

describe('parseWords', () => {
  it('reads hanzi, pinyin and english from a comma-separated line', () => {
    expect(parseWords('你好, nǐ hǎo, hello')).toEqual([
      { hanzi: '你好', pinyin: 'nǐ hǎo', english: 'hello' },
    ])
  })

  it('reads tab-separated lines, the shape you get pasting from a table', () => {
    expect(parseWords('水\tshuǐ\twater')).toEqual([
      { hanzi: '水', pinyin: 'shuǐ', english: 'water' },
    ])
  })

  it('leaves pinyin blank when only two fields are given', () => {
    expect(parseWords('水, water')).toEqual([
      { hanzi: '水', pinyin: '', english: 'water' },
    ])
  })

  it('keeps commas inside the english meaning', () => {
    expect(parseWords('好\thǎo\tgood, well, fine')).toEqual([
      { hanzi: '好', pinyin: 'hǎo', english: 'good, well, fine' },
    ])
  })

  it('reads many lines at once, trimming stray whitespace and blank lines', () => {
    const text = '  你好, nǐ hǎo, hello \n\n水, shuǐ, water\n  \n'
    expect(parseWords(text)).toEqual([
      { hanzi: '你好', pinyin: 'nǐ hǎo', english: 'hello' },
      { hanzi: '水', pinyin: 'shuǐ', english: 'water' },
    ])
  })

  it('skips lines that have no meaning to test against', () => {
    expect(parseWords('你好\n谢谢, xiè xie, thanks')).toEqual([
      { hanzi: '谢谢', pinyin: 'xiè xie', english: 'thanks' },
    ])
  })

  it('parses without judging duplicates — that is splitNew job', () => {
    expect(parseWords('水, shuǐ, water\n水, shuǐ, H2O')).toHaveLength(2)
  })
})

describe('splitNew', () => {
  const row = (hanzi: string, english = hanzi) => ({
    hanzi,
    pinyin: '',
    english,
  })

  it('adds a word that is not in the deck', () => {
    expect(splitNew([row('水')], [])).toEqual({
      add: [row('水')],
      skipped: [],
    })
  })

  it('skips a word already in the deck', () => {
    expect(splitNew([row('水')], ['水'])).toEqual({
      add: [],
      skipped: [row('水')],
    })
  })

  it('splits a mixed batch, keeping the original order of each group', () => {
    const rows = [row('a'), row('b'), row('c'), row('d')]
    expect(splitNew(rows, ['b', 'd'])).toEqual({
      add: [row('a'), row('c')],
      skipped: [row('b'), row('d')],
    })
  })

  it('skips a repeat inside the batch, keeping the first copy', () => {
    const first = { hanzi: '水', pinyin: 'shuǐ', english: 'water' }
    const second = { hanzi: '水', pinyin: 'shuǐ', english: 'H2O' }
    expect(splitNew([first, second], [])).toEqual({
      add: [first],
      skipped: [second],
    })
  })

  it('treats hanzi as the identity — a new meaning is still a duplicate', () => {
    const rows = [{ hanzi: '水', pinyin: 'shuǐ', english: 'a totally new gloss' }]
    expect(splitNew(rows, ['水']).skipped).toEqual(rows)
  })

  it('does not treat different words as duplicates of each other', () => {
    expect(splitNew([row('水'), row('冰')], ['水']).add).toEqual([row('冰')])
  })

  it('handles an empty batch and an empty deck', () => {
    expect(splitNew([], ['水'])).toEqual({ add: [], skipped: [] })
    expect(splitNew([row('水')], [])).toEqual({ add: [row('水')], skipped: [] })
  })

  it('never drops a row: add and skipped together account for all input', () => {
    const rows = [row('a'), row('b'), row('a'), row('c'), row('b')]
    const { add, skipped } = splitNew(rows, ['c'])
    expect(add.length + skipped.length).toBe(rows.length)
    expect([...add, ...skipped].map((r) => r.hanzi).sort()).toEqual([
      'a',
      'a',
      'b',
      'b',
      'c',
    ])
  })
})

describe('overwrite', () => {
  it('replaces the meaning of a word already in the deck', () => {
    const deck = [newCard('水', 'shuǐ', 'water')]
    const [updated] = overwrite(deck, [
      { hanzi: '水', pinyin: 'shuǐ', english: 'water (drinkable)' },
    ])
    expect(updated.english).toBe('water (drinkable)')
  })

  it('keeps all learning progress intact', () => {
    let card = newCard('水', 'shuǐ', 'water')
    card = review(card, 'good', 1000)
    card = review(card, 'again', 2000)
    const [updated] = overwrite([card], [
      { hanzi: '水', pinyin: 'shuei', english: 'new gloss' },
    ])
    expect({
      id: updated.id,
      box: updated.box,
      due: updated.due,
      lapses: updated.lapses,
      seen: updated.seen,
      lastSeen: updated.lastSeen,
    }).toEqual({
      id: card.id,
      box: card.box,
      due: card.due,
      lapses: card.lapses,
      seen: card.seen,
      lastSeen: card.lastSeen,
    })
  })

  it('does not erase a good pinyin with a blank one', () => {
    const deck = [newCard('水', 'shuǐ', 'water')]
    const [updated] = overwrite(deck, [
      { hanzi: '水', pinyin: '', english: 'water' },
    ])
    expect(updated.pinyin).toBe('shuǐ')
  })

  it('leaves untouched every card the batch does not mention', () => {
    const deck = [newCard('水', 'shuǐ', 'water'), newCard('冰', 'bīng', 'ice')]
    const after = overwrite(deck, [
      { hanzi: '水', pinyin: 'shuǐ', english: 'changed' },
    ])
    expect(after[1]).toEqual(deck[1])
    expect(after).toHaveLength(2)
  })

  it('adds nothing — a word not in the deck is not created', () => {
    const deck = [newCard('水', 'shuǐ', 'water')]
    const after = overwrite(deck, [
      { hanzi: '新', pinyin: 'xīn', english: 'new' },
    ])
    expect(after).toEqual(deck)
  })

  it('does not mutate the deck it is given', () => {
    const deck = [newCard('水', 'shuǐ', 'water')]
    overwrite(deck, [{ hanzi: '水', pinyin: 'shuǐ', english: 'changed' }])
    expect(deck[0].english).toBe('water')
  })
})
