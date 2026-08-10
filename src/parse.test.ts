import { describe, expect, it } from 'vitest'
import { parseWords } from './parse'

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

  it('drops words already in the deck so re-pasting a list is safe', () => {
    const text = '你好, nǐ hǎo, hello\n水, shuǐ, water'
    expect(parseWords(text, ['你好'])).toEqual([
      { hanzi: '水', pinyin: 'shuǐ', english: 'water' },
    ])
  })

  it('drops duplicates within the pasted text itself', () => {
    expect(parseWords('水, shuǐ, water\n水, shuǐ, H2O')).toEqual([
      { hanzi: '水', pinyin: 'shuǐ', english: 'water' },
    ])
  })
})
