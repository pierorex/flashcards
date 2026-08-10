import { useEffect, useRef, useState } from 'react'
import { parseWords } from './parse'
import { type Card, newCard, requeue, review, studySession } from './srs'
import { fromJSON, load, save } from './storage'
import './App.css'

const SESSION_CAP = 20

function speak(hanzi: string) {
  const u = new SpeechSynthesisUtterance(hanzi)
  u.lang = 'zh-CN'
  u.rate = 0.85
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}

/** Which side of the card is hidden. */
type Direction = 'zh-en' | 'en-zh'
type Turn = { card: Card; dir: Direction }
type Screen = 'home' | 'add' | 'deck' | 'play'

export default function App() {
  const [cards, setCards] = useState<Card[]>(load)
  const [screen, setScreen] = useState<Screen>('home')
  const [sessionKey, setSessionKey] = useState(0)

  useEffect(() => save(cards), [cards])

  const session = studySession(cards, Date.now(), SESSION_CAP)

  return (
    <main>
      {screen === 'home' && (
        <div className="home">
          <h1>汉字</h1>
          <p className="count">
            {cards.length === 0
              ? 'No words yet.'
              : session.practice
                ? `Nothing due — ${cards.length} in the deck`
                : `${session.due} of ${cards.length} due`}
          </p>
          <button
            className="big"
            disabled={cards.length === 0}
            onClick={() => setScreen('play')}
          >
            {session.practice ? 'Practice anyway' : 'Study'}
          </button>
          <button className="ghost" onClick={() => setScreen('add')}>
            Add words
          </button>
          {cards.length > 0 && (
            <button className="ghost" onClick={() => setScreen('deck')}>
              Deck ({cards.length})
            </button>
          )}
        </div>
      )}

      {screen === 'add' && (
        <Add
          known={cards.map((c) => c.hanzi)}
          onAdd={(rows) =>
            setCards((cs) => [
              ...cs,
              ...rows.map((r) => newCard(r.hanzi, r.pinyin, r.english)),
            ])
          }
          onDone={() => setScreen('home')}
        />
      )}

      {screen === 'deck' && (
        <Deck
          cards={cards}
          onChange={setCards}
          onDone={() => setScreen('home')}
        />
      )}

      {screen === 'play' && (
        <Play
          key={sessionKey}
          due={session.cards}
          practice={session.practice}
          onReview={(card, ok) =>
            setCards((cs) =>
              cs.map((c) =>
                c.id === card.id
                  ? review(c, ok, Date.now(), session.practice)
                  : c,
              ),
            )
          }
          remaining={() => studySession(cards, Date.now()).due}
          onAgain={() => setSessionKey((k) => k + 1)}
          onDone={() => setScreen('home')}
        />
      )}
    </main>
  )
}

function WordForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: { hanzi: string; pinyin: string; english: string }
  submitLabel: string
  onSubmit: (row: { hanzi: string; pinyin: string; english: string }) => void
  onCancel: () => void
}) {
  const [hanzi, setHanzi] = useState(initial?.hanzi ?? '')
  const [pinyin, setPinyin] = useState(initial?.pinyin ?? '')
  const [english, setEnglish] = useState(initial?.english ?? '')
  const first = useRef<HTMLInputElement>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!hanzi.trim() || !english.trim()) return
    onSubmit({
      hanzi: hanzi.trim(),
      pinyin: pinyin.trim(),
      english: english.trim(),
    })
    setHanzi('')
    setPinyin('')
    setEnglish('')
    first.current?.focus()
  }

  return (
    <form className="add" onSubmit={submit}>
      <input
        ref={first}
        value={hanzi}
        onChange={(e) => setHanzi(e.target.value)}
        placeholder="汉字"
        className="hanzi-input"
        autoFocus
      />
      <input
        value={pinyin}
        onChange={(e) => setPinyin(e.target.value)}
        placeholder="pīnyīn"
      />
      <input
        value={english}
        onChange={(e) => setEnglish(e.target.value)}
        placeholder="english"
      />
      <div className="row">
        <button type="button" className="ghost" onClick={onCancel}>
          Done
        </button>
        <button type="submit" className="big">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

function Add({
  known,
  onAdd,
  onDone,
}: {
  known: string[]
  onAdd: (rows: { hanzi: string; pinyin: string; english: string }[]) => void
  onDone: () => void
}) {
  const [bulk, setBulk] = useState(false)
  const [text, setText] = useState('')
  const [added, setAdded] = useState<string[]>([])

  function importPaste() {
    const rows = parseWords(text, [...known, ...added])
    if (rows.length === 0) return
    onAdd(rows)
    setAdded((a) => [...rows.map((r) => r.hanzi), ...a])
    setText('')
  }

  return (
    <>
      {bulk ? (
        <div className="add">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'你好, nǐ hǎo, hello\n水, shuǐ, water'}
            rows={8}
            autoFocus
          />
          <p className="count">One word per line: 汉字, pinyin, english</p>
          <div className="row">
            <button className="ghost" onClick={() => setBulk(false)}>
              One at a time
            </button>
            <button className="big" onClick={importPaste}>
              Import
            </button>
          </div>
        </div>
      ) : (
        <>
          <WordForm
            submitLabel="Add"
            onSubmit={(row) => {
              onAdd([row])
              setAdded((a) => [row.hanzi, ...a])
            }}
            onCancel={onDone}
          />
          <button className="ghost" onClick={() => setBulk(true)}>
            Paste a list
          </button>
        </>
      )}
      {added.length > 0 && (
        <p className="count">
          Added {added.length}: {added.slice(0, 8).join('  ')}
        </p>
      )}
      {bulk && (
        <button className="ghost" onClick={onDone}>
          Done
        </button>
      )}
    </>
  )
}

function Deck({
  cards,
  onChange,
  onDone,
}: {
  cards: Card[]
  onChange: (cards: Card[]) => void
  onDone: () => void
}) {
  const [editing, setEditing] = useState<Card | null>(null)
  const file = useRef<HTMLInputElement>(null)

  if (editing) {
    return (
      <WordForm
        initial={editing}
        submitLabel="Save"
        onSubmit={(row) => {
          onChange(cards.map((c) => (c.id === editing.id ? { ...c, ...row } : c)))
          setEditing(null)
        }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  function exportDeck() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `flashcards-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importDeck(f: File) {
    const restored = fromJSON(await f.text())
    if (!restored) {
      alert("That file isn't a flashcards backup.")
      return
    }
    if (confirm(`Replace ${cards.length} words with ${restored.length}?`)) {
      onChange(restored)
    }
  }

  return (
    <div className="deck">
      <div className="row">
        <button className="ghost" onClick={onDone}>
          ← Back
        </button>
        <button className="ghost" onClick={exportDeck}>
          Export
        </button>
        <button className="ghost" onClick={() => file.current?.click()}>
          Import
        </button>
      </div>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) importDeck(f)
          e.target.value = ''
        }}
      />
      <ul className="words">
        {cards.map((c) => (
          <li key={c.id}>
            <button className="word" onClick={() => setEditing(c)}>
              <span className="w-hanzi">{c.hanzi}</span>
              <span className="w-meaning">
                {c.pinyin && <em>{c.pinyin}</em>} {c.english}
              </span>
              {c.box > 0 && <span className="w-box">{c.box}</span>}
            </button>
            <button
              className="del"
              aria-label={`Delete ${c.hanzi}`}
              onClick={() => onChange(cards.filter((x) => x.id !== c.id))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Play({
  due,
  practice,
  onReview,
  remaining,
  onAgain,
  onDone,
}: {
  due: Card[]
  practice: boolean
  onReview: (card: Card, ok: boolean) => void
  remaining: () => number
  onAgain: () => void
  onDone: () => void
}) {
  const [queue, setQueue] = useState<Turn[]>(() =>
    due.map((card) => ({
      card,
      dir: Math.random() < 0.5 ? 'zh-en' : 'en-zh',
    })),
  )
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ right: 0, wrong: 0 })

  const turn = queue[0]

  if (!turn) {
    const left = remaining()
    return (
      <div className="home">
        <h1>{score.wrong === 0 ? '完美' : '好'}</h1>
        <p className="count">
          {score.right} right · {score.wrong} missed
        </p>
        {left > 0 && (
          <button className="big" onClick={onAgain}>
            {left} more due — keep going
          </button>
        )}
        <button className={left > 0 ? 'ghost' : 'big'} onClick={onDone}>
          Done
        </button>
      </div>
    )
  }

  function grade(ok: boolean) {
    onReview(turn.card, ok)
    setScore((s) => ({
      right: s.right + (ok ? 1 : 0),
      wrong: s.wrong + (ok ? 0 : 1),
    }))
    setRevealed(false)
    // Missed cards come back later this session; correct ones are done for now.
    setQueue((q) => (ok ? q.slice(1) : requeue(q.slice(1), turn, 3)))
  }

  function miss() {
    setRevealed(true)
    speak(turn.card.hanzi)
  }

  const showZh = turn.dir === 'zh-en' || revealed
  const showEn = turn.dir === 'en-zh' || revealed

  return (
    <div className="play">
      <div className="progress">
        {queue.length} left{practice && ' · practice'}
      </div>

      <div className="card">
        {showZh && (
          <>
            <div className="hanzi">{turn.card.hanzi}</div>
            <div className="pinyin">{turn.card.pinyin}</div>
            <button
              className="speak"
              onClick={() => speak(turn.card.hanzi)}
              aria-label="Play pronunciation"
            >
              🔊
            </button>
          </>
        )}
        {showEn && <div className="english">{turn.card.english}</div>}
      </div>

      {revealed ? (
        <button className="big next" onClick={() => grade(false)}>
          Got it — next
        </button>
      ) : (
        <div className="row">
          <button className="grade wrong" onClick={miss} aria-label="I forgot">
            ✕
          </button>
          <button
            className="grade right"
            onClick={() => grade(true)}
            aria-label="I knew it"
          >
            ✓
          </button>
        </div>
      )}
    </div>
  )
}
