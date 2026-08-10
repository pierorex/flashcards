import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { parseWords } from './parse'
import {
  type Card,
  failRate,
  newCard,
  requeue,
  resetProgress,
  review,
  studySession,
  worstWords,
} from './srs'
import { fromJSON, load, save } from './storage'
import './App.css'

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
type Screen = 'home' | 'add' | 'deck' | 'play' | 'auto'

export default function App() {
  const [cards, setCards] = useState<Card[]>(load)
  const [screen, setScreen] = useState<Screen>('home')
  const [sessionKey, setSessionKey] = useState(0)

  useEffect(() => save(cards), [cards])

  const session = studySession(cards, Date.now())

  return (
    <main>
      <UpdateBanner />

      {screen === 'home' && (
        <div className="home">
          <h1>汉字</h1>
          <button
            className="big"
            disabled={cards.length === 0}
            onClick={() => setScreen('play')}
          >
            Study ({cards.length} {cards.length === 1 ? 'word' : 'words'})
          </button>
          {cards.length > 0 && (
            <button className="ghost" onClick={() => setScreen('auto')}>
              Autopilot
            </button>
          )}
          <button className="ghost" onClick={() => setScreen('add')}>
            Add words
          </button>
          {cards.length > 0 && (
            <button className="ghost" onClick={() => setScreen('deck')}>
              Deck
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

      {screen === 'auto' && (
        <Autopilot cards={cards} onDone={() => setScreen('home')} />
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

/** The app is cached for offline use, so a new build needs an explicit swap. */
function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null
  return (
    <button className="update" onClick={() => updateServiceWorker(true)}>
      New version — tap to update
    </button>
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
      <>
        <WordForm
          initial={editing}
          submitLabel="Save"
          onSubmit={(row) => {
            onChange(
              cards.map((c) => (c.id === editing.id ? { ...c, ...row } : c)),
            )
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
        <button
          className="ghost danger"
          onClick={() => {
            onChange(cards.filter((c) => c.id !== editing.id))
            setEditing(null)
          }}
        >
          Delete {editing.hanzi}
        </button>
      </>
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
      <Stats cards={cards} onPick={setEditing} />
      {cards.some((c) => c.seen > 0 || c.box > 0) && (
        <button
          className="ghost danger"
          onClick={() => {
            if (confirm(`Reset all progress? The ${cards.length} words stay.`)) {
              onChange(cards.map(resetProgress))
            }
          }}
        >
          Reset progress
        </button>
      )}
    </div>
  )
}

type SortKey = 'word' | 'seen' | 'right' | 'wrong' | 'rate' | 'box'

const COLUMNS: { key: SortKey; label: string; title: string }[] = [
  { key: 'word', label: '词', title: 'Word' },
  { key: 'seen', label: '👁', title: 'Times seen' },
  { key: 'right', label: '✓', title: 'Remembered' },
  { key: 'wrong', label: '✕', title: 'Forgotten' },
  { key: 'rate', label: '%', title: 'Success rate' },
  { key: 'box', label: '📦', title: 'Leitner box — higher is better known' },
]

const value = (c: Card, key: SortKey): number | string => {
  switch (key) {
    case 'word':
      return c.english // alphabetical by meaning; hanzi order is codepoints
    case 'seen':
      return c.seen
    case 'right':
      return c.seen - c.lapses
    case 'wrong':
      return c.lapses
    case 'rate':
      return 1 - failRate(c)
    case 'box':
      return c.box
  }
}

function Stats({
  cards,
  onPick,
}: {
  cards: Card[]
  onPick: (c: Card) => void
}) {
  // Worst first: the words that need work are the point of this table.
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({
    key: 'rate',
    asc: true,
  })

  const rows = [...cards].sort((a, b) => {
    const [x, y] = [value(a, sort.key), value(b, sort.key)]
    const cmp =
      typeof x === 'string' && typeof y === 'string'
        ? x.localeCompare(y)
        : (x as number) - (y as number)
    return sort.asc ? cmp : -cmp
  })

  const seen = cards.reduce((n, c) => n + c.seen, 0)
  const lapses = cards.reduce((n, c) => n + c.lapses, 0)
  const leeches = cards.filter((c) => c.lapses >= 8).length

  return (
    <>
      <p className="count">
        {cards.length} words
        {seen > 0 && ` · ${Math.round(((seen - lapses) / seen) * 100)}% overall`}
        {leeches > 0 && ` · ${leeches} stuck`}
      </p>
      <table className="stats">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key}>
                <button
                  title={col.title}
                  aria-label={col.title}
                  className={sort.key === col.key ? 'sorted' : ''}
                  onClick={() =>
                    setSort((s) =>
                      s.key === col.key
                        ? { key: col.key, asc: !s.asc }
                        : { key: col.key, asc: col.key === 'word' },
                    )
                  }
                >
                  {col.label}
                  {sort.key === col.key && (sort.asc ? ' ↑' : ' ↓')}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr
              key={c.id}
              onClick={() => onPick(c)}
              className={c.lapses >= 8 ? 'leech' : undefined}
            >
              <td>
                <span className="w-hanzi">{c.hanzi}</span>
                <span className="w-meaning">{c.english}</span>
              </td>
              <td>{c.seen}</td>
              <td>{c.seen - c.lapses}</td>
              <td>{c.lapses}</td>
              <td>
                {c.seen === 0
                  ? '—'
                  : `${Math.round((1 - failRate(c)) * 100)}%`}
              </td>
              <td>{c.box}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

const say = (text: string, lang: string, rate: number) =>
  new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = rate
    u.onend = () => resolve()
    u.onerror = () => resolve() // a dead voice must not stall the loop
    speechSynthesis.speak(u)
  })

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Hands-free drilling: loops your worst words aloud, english then hanzi.
 * Holds a screen wake lock — iOS suspends JS (and speech) once the app is
 * backgrounded or the screen locks, so staying awake and foregrounded is the
 * only way the audio keeps going.
 */
function Autopilot({ cards, onDone }: { cards: Card[]; onDone: () => void }) {
  const [size, setSize] = useState(Math.min(10, cards.length))
  const [words, setWords] = useState<Card[] | null>(null)
  const [current, setCurrent] = useState<Card | null>(null)

  useEffect(() => {
    if (!words || words.length === 0) return
    let stopped = false

    async function loop() {
      while (!stopped) {
        for (const card of words!) {
          if (stopped) return
          setCurrent(card)
          // Every step is guarded: speaking even once after Stop is jarring
          // when this is running next to a sleeping person.
          const steps = [
            () => say(card.english, 'en-US', 0.95),
            () => wait(500),
            () => say(card.hanzi, 'zh-CN', 0.75),
            () => wait(800),
            () => say(card.hanzi, 'zh-CN', 0.75),
            () => wait(1200),
          ]
          for (const step of steps) {
            if (stopped) return
            await step()
          }
        }
      }
    }
    loop()

    return () => {
      stopped = true
      speechSynthesis.cancel()
    }
  }, [words])

  // Keep the screen on; re-request it after the phone has been unlocked.
  useEffect(() => {
    if (!words) return
    let lock: WakeLockSentinel | null = null
    const acquire = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null
      } catch {
        // Wake lock is a nicety; without it the screen just dims as usual.
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [words])

  if (!words) {
    return (
      <div className="home">
        <h1>自动</h1>
        <p className="count">
          Loops your {size} worst words aloud — english, then chinese twice.
        </p>
        <input
          type="range"
          min={1}
          max={cards.length}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          aria-label="How many words"
        />
        <p className="count">
          {size} of {cards.length} words
        </p>
        <button className="big" onClick={() => setWords(worstWords(cards, size))}>
          Start
        </button>
        <button className="ghost" onClick={onDone}>
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="play">
      <button className="close" onClick={onDone} aria-label="Stop autopilot">
        ✕
      </button>
      <div className="progress">{words.length} words · looping</div>
      <div className="card">
        <div className="english">{current?.english}</div>
        <div className="hanzi">{current?.hanzi}</div>
        <div className="pinyin">{current?.pinyin}</div>
      </div>
      <button className="big" onClick={onDone}>
        Stop
      </button>
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
      <button className="close" onClick={onDone} aria-label="End session">
        ✕
      </button>
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
