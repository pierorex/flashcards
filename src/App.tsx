import { useEffect, useRef, useState } from 'react'
import { type Card, newCard, requeue, review, studySession } from './srs'
import { load, save } from './storage'
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

export default function App() {
  const [cards, setCards] = useState<Card[]>(load)
  const [screen, setScreen] = useState<'home' | 'add' | 'play'>('home')

  useEffect(() => save(cards), [cards])

  const session = studySession(cards, Date.now())

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
                : `${session.cards.length} of ${cards.length} due`}
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
        </div>
      )}

      {screen === 'add' && (
        <AddWords
          onAdd={(c) => setCards((cs) => [...cs, c])}
          onDone={() => setScreen('home')}
        />
      )}

      {screen === 'play' && (
        <Play
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
          onDone={() => setScreen('home')}
        />
      )}
    </main>
  )
}

function AddWords({
  onAdd,
  onDone,
}: {
  onAdd: (c: Card) => void
  onDone: () => void
}) {
  const [hanzi, setHanzi] = useState('')
  const [pinyin, setPinyin] = useState('')
  const [english, setEnglish] = useState('')
  const [added, setAdded] = useState<string[]>([])
  const first = useRef<HTMLInputElement>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!hanzi.trim() || !english.trim()) return
    onAdd(newCard(hanzi.trim(), pinyin.trim(), english.trim()))
    setAdded((a) => [hanzi.trim(), ...a])
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
        <button type="button" className="ghost" onClick={onDone}>
          Done
        </button>
        <button type="submit" className="big">
          Add
        </button>
      </div>
      {added.length > 0 && (
        <p className="count">Added: {added.slice(0, 8).join('  ')}</p>
      )}
    </form>
  )
}

function Play({
  due,
  practice,
  onReview,
  onDone,
}: {
  due: Card[]
  practice: boolean
  onReview: (card: Card, ok: boolean) => void
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
    return (
      <div className="home">
        <h1>{score.wrong === 0 ? '完美' : '好'}</h1>
        <p className="count">
          {score.right} right · {score.wrong} missed
        </p>
        <button className="big" onClick={onDone}>
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
