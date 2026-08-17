'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface CellInfo {
  row: number
  col: number
  number?: number
}

interface ClueInfo {
  number: number
  clue: string
  length: number
  row: number
  col: number
}

interface HintCell {
  row: number
  col: number
  letter: string
}

interface PuzzleData {
  attemptId: string
  startedAt: string
  gridRows: number
  gridCols: number
  cells: CellInfo[]
  clues: { across: ClueInfo[]; down: ClueInfo[] }
  wordCount: number
  tag: string
  hints: HintCell[]
}

interface Props {
  visitorName: string
}

type Phase = 'intro' | 'loading' | 'playing' | 'checking' | 'solved' | 'letter' | 'error'
type Direction = 'across' | 'down'

// ── Decorative helpers ──────────────────────────────────────────────
function StarField() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    left: `${(i * 137.5) % 100}%`,
    top: `${(i * 97.3) % 100}%`,
    size: 1 + (i % 3),
    opacity: 0.06 + (i % 5) * 0.05,
    duration: 2 + (i % 4),
    delay: (i % 7) * 0.5,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: 'white',
            opacity: s.opacity,
            animation: `cwTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function FlowerSVG({
  x,
  y,
  size = 28,
  color = '#C9A84C',
}: {
  x: number | string
  y: number | string
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ position: 'absolute', left: x, top: y, opacity: 0.35, pointerEvents: 'none' }}
    >
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <ellipse
          key={i}
          cx="20"
          cy="12"
          rx="5"
          ry="9"
          fill={i % 2 === 0 ? color : '#9B7FCC'}
          transform={`rotate(${deg}, 20, 20)`}
          opacity="0.7"
        />
      ))}
      <circle cx="20" cy="20" r="6" fill={color} />
    </svg>
  )
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ── Main component ──────────────────────────────────────────────────
export default function CrosswordSection({ visitorName }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null)
  const [grid, setGrid] = useState<string[][]>([])
  const [whiteMap, setWhiteMap] = useState<Set<string>>(new Set())
  const [numberMap, setNumberMap] = useState<Map<string, number>>(new Map())
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null)
  const [direction, setDirection] = useState<Direction>('across')
  const [elapsed, setElapsed] = useState(0)
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set())
  const [hintMap, setHintMap] = useState<Map<string, string>>(new Map())
  const [secretNote, setSecretNote] = useState('')
  const [finalScore, setFinalScore] = useState(0)
  const [finalTime, setFinalTime] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const startTimeRef = useRef<number | null>(null)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const submittedRef = useRef(false)
  const restoredGridRef = useRef<string[][] | null>(null)

  // ── Build maps from puzzle ────────────────────────────────────────
  useEffect(() => {
    if (!puzzle) return
    const wm = new Set<string>()
    const nm = new Map<string, number>()
    for (const c of puzzle.cells) {
      wm.add(`${c.row},${c.col}`)
      if (c.number !== undefined) nm.set(`${c.row},${c.col}`, c.number)
    }
    setWhiteMap(wm)
    setNumberMap(nm)
    // Build hint map
    const hm = new Map<string, string>()
    for (const h of puzzle.hints ?? []) {
      hm.set(`${h.row},${h.col}`, h.letter)
    }
    setHintMap(hm)
    // Init grid — pre-fill hint cells
    const g: string[][] = []
    for (let r = 0; r < puzzle.gridRows; r++) {
      const row: string[] = []
      for (let c = 0; c < puzzle.gridCols; c++) {
        const key = `${r},${c}`
        row.push(wm.has(key) ? (hm.get(key) ?? '') : '\x00')
      }
      g.push(row)
    }
    // Override with saved grid if restoring
    if (restoredGridRef.current) {
      setGrid(restoredGridRef.current)
      restoredGridRef.current = null
    } else {
      setGrid(g)
    }
    // Select first white cell in first across clue
    const first = puzzle.clues.across[0] ?? puzzle.clues.down[0]
    if (first) {
      setSelected({ row: first.row, col: first.col })
      setDirection(puzzle.clues.across.length > 0 ? 'across' : 'down')
    }
  }, [puzzle])

  // ── Timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    if (startTimeRef.current === null) startTimeRef.current = Date.now()
    const initial = startTimeRef.current
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - initial) / 1000))
    }, 1000)
    return () => clearInterval(iv)
  }, [phase])

  // ── Save grid to localStorage on change ──────────────────────────
  useEffect(() => {
    if (!puzzle || phase !== 'playing' || grid.length === 0) return
    try {
      localStorage.setItem(`cw-grid-${puzzle.attemptId}`, JSON.stringify(grid))
    } catch {}
  }, [grid, puzzle, phase])

  // ── Restore in-progress puzzle on mount ──────────────────────────
  useEffect(() => {
    if (!visitorName) return
    const sessionKey = `cw-session-${visitorName}`
    let saved: { attemptId: string; hints: HintCell[]; elapsedOffset: number } | null = null
    try {
      const raw = localStorage.getItem(sessionKey)
      if (raw) saved = JSON.parse(raw)
    } catch {}
    if (!saved) return

    const { attemptId, hints, elapsedOffset } = saved
    ;(async () => {
      try {
        const res = await fetch(`/api/crossword/resume?attemptId=${attemptId}`)
        const data = await res.json()
        if (!res.ok || data.error || data.status === 'completed') {
          localStorage.removeItem(sessionKey)
          localStorage.removeItem(`cw-grid-${attemptId}`)
          return
        }
        // Restore saved grid
        try {
          const rawGrid = localStorage.getItem(`cw-grid-${attemptId}`)
          if (rawGrid) restoredGridRef.current = JSON.parse(rawGrid)
        } catch {}

        const elapsedSoFar: number = data.elapsedSoFar ?? 0
        startTimeRef.current = Date.now() - (elapsedSoFar + elapsedOffset) * 1000
        submittedRef.current = false
        setElapsed(elapsedSoFar + elapsedOffset)
        setWrongCells(new Set())
        setPuzzle({ ...data, hints })
        setPhase('playing')
      } catch {}
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorName])

  // ── Start puzzle ──────────────────────────────────────────────────
  const startPuzzle = useCallback(async () => {
    setPhase('loading')
    setErrorMsg('')
    submittedRef.current = false
    startTimeRef.current = null
    setElapsed(0)
    setWrongCells(new Set())
    try {
      const res = await fetch('/api/crossword/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName: visitorName }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? 'Could not load crossword')
        setPhase('error')
        return
      }
      const puzzleData = data as PuzzleData
      // Save session for refresh restoration
      try {
        localStorage.setItem(`cw-session-${visitorName}`, JSON.stringify({
          attemptId: puzzleData.attemptId,
          hints: puzzleData.hints,
          elapsedOffset: 0,
        }))
        localStorage.removeItem(`cw-grid-${puzzleData.attemptId}`)
      } catch {}
      setPuzzle(puzzleData)
      setPhase('playing')
    } catch {
      setErrorMsg('Network error')
      setPhase('error')
    }
  }, [visitorName])

  // ── Reset on name change ──────────────────────────────────────────
  useEffect(() => {
    // Don't reset — restore effect below will handle it if there's a saved session
    // This runs on first mount too, so we check if restore effect already ran
  }, [visitorName])

  // ── Compute active word (cells belonging to selected clue) ────────
  const activeWord = useMemo(() => {
    if (!puzzle || !selected) return { cells: [] as string[], clue: null as ClueInfo | null }
    // Find clue matching direction that contains selected
    const list = direction === 'across' ? puzzle.clues.across : puzzle.clues.down
    for (const c of list) {
      if (direction === 'across') {
        if (
          selected.row === c.row &&
          selected.col >= c.col &&
          selected.col < c.col + c.length
        ) {
          const cells: string[] = []
          for (let i = 0; i < c.length; i++) cells.push(`${c.row},${c.col + i}`)
          return { cells, clue: c }
        }
      } else {
        if (
          selected.col === c.col &&
          selected.row >= c.row &&
          selected.row < c.row + c.length
        ) {
          const cells: string[] = []
          for (let i = 0; i < c.length; i++) cells.push(`${c.row + i},${c.col}`)
          return { cells, clue: c }
        }
      }
    }
    return { cells: [] as string[], clue: null as ClueInfo | null }
  }, [puzzle, selected, direction])

  // ── Cell click ────────────────────────────────────────────────────
  const handleCellClick = useCallback(
    (r: number, c: number) => {
      const key = `${r},${c}`
      if (!whiteMap.has(key)) return
      if (selected && selected.row === r && selected.col === c) {
        // Toggle direction if cell is in both
        if (!puzzle) return
        const inAcross = puzzle.clues.across.some(
          cl => r === cl.row && c >= cl.col && c < cl.col + cl.length
        )
        const inDown = puzzle.clues.down.some(
          cl => c === cl.col && r >= cl.row && r < cl.row + cl.length
        )
        if (inAcross && inDown) {
          setDirection(d => (d === 'across' ? 'down' : 'across'))
        }
      } else {
        setSelected({ row: r, col: c })
        // Auto-pick direction if only one applies
        if (puzzle) {
          const inAcross = puzzle.clues.across.some(
            cl => r === cl.row && c >= cl.col && c < cl.col + cl.length
          )
          const inDown = puzzle.clues.down.some(
            cl => c === cl.col && r >= cl.row && r < cl.row + cl.length
          )
          if (direction === 'across' && !inAcross && inDown) setDirection('down')
          else if (direction === 'down' && !inDown && inAcross) setDirection('across')
        }
      }
      hiddenInputRef.current?.focus()
    },
    [whiteMap, selected, puzzle, direction]
  )

  // ── Advance/retreat within active word ────────────────────────────
  const moveInWord = useCallback(
    (delta: number) => {
      if (!selected || !activeWord.clue) return
      const clue = activeWord.clue
      let idx: number
      if (direction === 'across') {
        idx = selected.col - clue.col + delta
        if (idx >= 0 && idx < clue.length) setSelected({ row: clue.row, col: clue.col + idx })
      } else {
        idx = selected.row - clue.row + delta
        if (idx >= 0 && idx < clue.length) setSelected({ row: clue.row + idx, col: clue.col })
      }
    },
    [selected, activeWord, direction]
  )

  // ── Key handling ──────────────────────────────────────────────────
  const handleKey = useCallback(
    (e: KeyboardEvent | React.KeyboardEvent) => {
      if (phase !== 'playing') return
      if (!selected) return
      const key = e.key
      if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault?.()
        const isHint = hintMap.has(`${selected.row},${selected.col}`)
        if (isHint) { setTimeout(() => moveInWord(1), 0); return }
        setGrid(g => {
          const ng = g.map(row => [...row])
          ng[selected.row][selected.col] = key.toUpperCase()
          return ng
        })
        setWrongCells(w => {
          if (!w.has(`${selected.row},${selected.col}`)) return w
          const n = new Set(w)
          n.delete(`${selected.row},${selected.col}`)
          return n
        })
        setTimeout(() => moveInWord(1), 0)
      } else if (key === 'Backspace') {
        e.preventDefault?.()
        if (hintMap.has(`${selected.row},${selected.col}`)) { moveInWord(-1); return }
        setGrid(g => {
          const ng = g.map(row => [...row])
          if (ng[selected.row][selected.col] && !hintMap.has(`${selected.row},${selected.col}`)) {
            ng[selected.row][selected.col] = ''
          } else {
            // move back and clear
            const clue = activeWord.clue
            if (clue) {
              if (direction === 'across' && selected.col > clue.col) {
                ng[selected.row][selected.col - 1] = ''
                setTimeout(() => setSelected({ row: selected.row, col: selected.col - 1 }), 0)
              } else if (direction === 'down' && selected.row > clue.row) {
                ng[selected.row - 1][selected.col] = ''
                setTimeout(() => setSelected({ row: selected.row - 1, col: selected.col }), 0)
              }
            }
          }
          return ng
        })
      } else if (key === 'ArrowRight') {
        e.preventDefault?.()
        if (direction === 'across') moveInWord(1)
        else {
          // move horizontally to next white
          for (let c = selected.col + 1; c < (puzzle?.gridCols ?? 0); c++) {
            if (whiteMap.has(`${selected.row},${c}`)) {
              setSelected({ row: selected.row, col: c })
              setDirection('across')
              break
            }
          }
        }
      } else if (key === 'ArrowLeft') {
        e.preventDefault?.()
        if (direction === 'across') moveInWord(-1)
        else {
          for (let c = selected.col - 1; c >= 0; c--) {
            if (whiteMap.has(`${selected.row},${c}`)) {
              setSelected({ row: selected.row, col: c })
              setDirection('across')
              break
            }
          }
        }
      } else if (key === 'ArrowDown') {
        e.preventDefault?.()
        if (direction === 'down') moveInWord(1)
        else {
          for (let r = selected.row + 1; r < (puzzle?.gridRows ?? 0); r++) {
            if (whiteMap.has(`${r},${selected.col}`)) {
              setSelected({ row: r, col: selected.col })
              setDirection('down')
              break
            }
          }
        }
      } else if (key === 'ArrowUp') {
        e.preventDefault?.()
        if (direction === 'down') moveInWord(-1)
        else {
          for (let r = selected.row - 1; r >= 0; r--) {
            if (whiteMap.has(`${r},${selected.col}`)) {
              setSelected({ row: r, col: selected.col })
              setDirection('down')
              break
            }
          }
        }
      } else if (key === 'Tab') {
        e.preventDefault?.()
        // Jump to next clue
        if (!puzzle || !activeWord.clue) return
        const list = direction === 'across' ? puzzle.clues.across : puzzle.clues.down
        const idx = list.findIndex(c => c.number === activeWord.clue!.number)
        const next = list[(idx + 1) % list.length]
        if (next) setSelected({ row: next.row, col: next.col })
      }
    },
    [phase, selected, activeWord, direction, moveInWord, puzzle, whiteMap, hintMap]
  )

  useEffect(() => {
    if (phase !== 'playing') return
    const listener = (e: KeyboardEvent) => handleKey(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [phase, handleKey])

  // ── Auto-submit when all filled ───────────────────────────────────
  const allFilled = useMemo(() => {
    if (!puzzle || grid.length === 0) return false
    for (const c of puzzle.cells) {
      if (!grid[c.row]?.[c.col]) return false
    }
    return true
  }, [grid, puzzle])

  const filledCount = useMemo(() => {
    if (!puzzle || grid.length === 0) return 0
    let filled = 0
    const total = puzzle.clues.across.length + puzzle.clues.down.length
    const list = [...puzzle.clues.across.map(c => ({ ...c, dir: 'across' as const })), ...puzzle.clues.down.map(c => ({ ...c, dir: 'down' as const }))]
    for (const c of list) {
      let full = true
      for (let i = 0; i < c.length; i++) {
        const r = c.dir === 'across' ? c.row : c.row + i
        const cc = c.dir === 'across' ? c.col + i : c.col
        if (!grid[r]?.[cc]) {
          full = false
          break
        }
      }
      if (full) filled++
    }
    return `${filled} / ${total}`
  }, [grid, puzzle])

  const submitPuzzle = useCallback(async () => {
    if (!puzzle || submittedRef.current) return
    submittedRef.current = true
    setPhase('checking')

    const answers: { wordNumber: number; direction: string; answer: string }[] = []
    for (const c of puzzle.clues.across) {
      let s = ''
      for (let i = 0; i < c.length; i++) s += grid[c.row]?.[c.col + i] ?? ''
      answers.push({ wordNumber: c.number, direction: 'across', answer: s })
    }
    for (const c of puzzle.clues.down) {
      let s = ''
      for (let i = 0; i < c.length; i++) s += grid[c.row + i]?.[c.col] ?? ''
      answers.push({ wordNumber: c.number, direction: 'down', answer: s })
    }

    try {
      const res = await fetch('/api/crossword/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: puzzle.attemptId, answers }),
      })
      const data = await res.json()
      if (data.success) {
        // Clear saved progress
        try {
          localStorage.removeItem(`cw-session-${visitorName}`)
          if (puzzle) localStorage.removeItem(`cw-grid-${puzzle.attemptId}`)
        } catch {}
        setFinalScore(data.score ?? 0)
        setFinalTime(data.elapsed_seconds ?? elapsed)
        setSecretNote(data.secretNote ?? 'You solved it! 🎉')
        setPhase('solved')
        setTimeout(() => setPhase('letter'), 2000)
      } else {
        // Mark wrong cells
        const wrongSet = new Set<string>()
        for (const w of data.wrong ?? []) {
          const clueList = w.direction === 'across' ? puzzle.clues.across : puzzle.clues.down
          const clue = clueList.find(c => c.number === w.wordNumber)
          if (!clue) continue
          for (let i = 0; i < clue.length; i++) {
            const r = w.direction === 'across' ? clue.row : clue.row + i
            const c = w.direction === 'across' ? clue.col + i : clue.col
            wrongSet.add(`${r},${c}`)
          }
        }
        setWrongCells(wrongSet)
        submittedRef.current = false
        setPhase('playing')
      }
    } catch {
      submittedRef.current = false
      setPhase('playing')
    }
  }, [puzzle, grid, elapsed])

  // No auto-submit — guest clicks the submit button manually

  // ── Hidden input change (mobile) ──────────────────────────────────
  const handleHiddenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v.length === 0) return
    const ch = v[v.length - 1]
    if (/^[a-zA-Z]$/.test(ch)) {
      handleKey({ key: ch, preventDefault: () => {} } as unknown as KeyboardEvent)
    }
    e.target.value = ''
  }

  const CELL = 'clamp(28px, 6vw, 36px)'

  // ── Render ────────────────────────────────────────────────────────
  return (
    <section
      style={{
        position: 'relative',
        padding: '80px 16px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #080614 0%, #130d30 50%, #080614 100%)',
      }}
    >
      <StarField />
      <FlowerSVG x={20} y={30} size={32} color="#C9A84C" />
      <FlowerSVG x={-10} y={120} size={24} color="#9B7FCC" />
      <FlowerSVG x="calc(100% - 40px)" y={40} size={28} color="#E8856A" />
      <FlowerSVG x="calc(100% - 20px)" y={100} size={20} color="#C9A84C" />

      <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.3em',
              color: 'rgba(201,168,76,0.6)',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            ✦ &nbsp; one last surprise &nbsp; ✦
          </p>
          <h2
            style={{
              fontSize: 'clamp(26px, 5vw, 44px)',
              fontWeight: 700,
              color: '#E8D5A3',
              letterSpacing: '-0.02em',
              marginBottom: 10,
            }}
          >
            A Crossword Just For You
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>
            Solve every word to unlock a secret little letter ✉️
          </p>
        </div>

        {/* ── INTRO ── */}
        {phase === 'intro' && (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: 20,
              padding: '40px 32px',
              textAlign: 'center',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              animation: 'cwFadeUp 0.5s ease-out',
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 16 }}>🧩</div>
            <h3 style={{ color: '#E8D5A3', fontWeight: 700, fontSize: 22, marginBottom: 12 }}>
              One Last Little Challenge…
            </h3>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 14,
                lineHeight: 1.6,
                maxWidth: 440,
                margin: '0 auto 32px',
              }}
            >
              A crossword made just for you — solve it to unlock a secret message ✉️
            </p>
            <button
              onClick={startPuzzle}
              style={{
                padding: '14px 36px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #C9A84C 0%, #E8D5A3 50%, #C9A84C 100%)',
                color: '#0d0820',
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(201,168,76,0.3)',
              }}
            >
              Solve the Puzzle →
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 40, animation: 'cwSpin 1s linear infinite' }}>✨</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 16, fontSize: 14 }}>
              Preparing your crossword…
            </p>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(232,133,106,0.3)',
              borderRadius: 20,
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>💫</div>
            <p style={{ color: '#E8D5A3', fontSize: 15, marginBottom: 20 }}>
              {errorMsg.includes('Not enough words')
                ? 'Coming soon…'
                : `Couldn't load: ${errorMsg}`}
            </p>
            <button
              onClick={() => setPhase('intro')}
              style={{
                padding: '10px 24px',
                borderRadius: 12,
                border: '1px solid rgba(201,168,76,0.3)',
                background: 'transparent',
                color: '#E8D5A3',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Back
            </button>
          </div>
        )}

        {/* ── PLAYING / CHECKING ── */}
        {(phase === 'playing' || phase === 'checking') && puzzle && (
          <div style={{ animation: 'cwFadeUp 0.4s ease-out' }}>
            {/* Timer + progress */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  color: '#E8D5A3',
                  fontWeight: 700,
                  fontSize: 14,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ⏱ {formatTime(elapsed)}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                {filledCount} words filled
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 24,
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'flex-start',
              }}
            >
              {/* Grid */}
              <div style={{ position: 'relative' }}>
                {activeWord.clue && (
                  <div
                    style={{
                      background: 'rgba(155,127,204,0.1)',
                      border: '1px solid rgba(155,127,204,0.25)',
                      borderRadius: 10,
                      padding: '8px 14px',
                      marginBottom: 10,
                      color: '#E8D5A3',
                      fontSize: 13,
                      maxWidth: 360,
                    }}
                  >
                    <span style={{ color: '#9B7FCC', fontWeight: 700 }}>
                      {activeWord.clue.number} {direction === 'across' ? '→' : '↓'}
                    </span>{' '}
                    {activeWord.clue.clue}
                  </div>
                )}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${puzzle.gridCols}, ${CELL})`,
                    gridTemplateRows: `repeat(${puzzle.gridRows}, ${CELL})`,
                    gap: 2,
                    padding: 8,
                    background: 'rgba(0,0,0,0.35)',
                    borderRadius: 12,
                    border: '1px solid rgba(201,168,76,0.2)',
                    position: 'relative',
                  }}
                >
                  {Array.from({ length: puzzle.gridRows * puzzle.gridCols }).map((_, i) => {
                    const r = Math.floor(i / puzzle.gridCols)
                    const c = i % puzzle.gridCols
                    const key = `${r},${c}`
                    const isWhite = whiteMap.has(key)
                    const num = numberMap.get(key)
                    const isSelected = selected?.row === r && selected?.col === c
                    const isActive = activeWord.cells.includes(key)
                    const isWrong = wrongCells.has(key)
                    const isHint = hintMap.has(key)
                    if (!isWhite) {
                      return (
                        <div
                          key={i}
                          style={{
                            background: '#080614',
                            borderRadius: 2,
                          }}
                        />
                      )
                    }
                    return (
                      <div
                        key={i}
                        onClick={() => handleCellClick(r, c)}
                        style={{
                          position: 'relative',
                          background: isSelected
                            ? 'rgba(201,168,76,0.25)'
                            : isHint
                            ? 'rgba(155,127,204,0.18)'
                            : isActive
                            ? 'rgba(155,127,204,0.1)'
                            : '#fdf8f0',
                          color: isHint ? '#5a3e8a' : isWrong ? '#E8856A' : '#0d0820',
                          border: isSelected
                            ? '2px solid #C9A84C'
                            : isHint
                            ? '1px solid rgba(155,127,204,0.5)'
                            : isWrong
                            ? '1px solid #E8856A'
                            : '1px solid rgba(201,168,76,0.2)',
                          borderRadius: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 'clamp(14px, 3.5vw, 20px)',
                          cursor: 'pointer',
                          userSelect: 'none',
                          textTransform: 'uppercase',
                        }}
                      >
                        {num !== undefined && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 1,
                              left: 2,
                              fontSize: 9,
                              fontWeight: 600,
                              color: isSelected || isActive ? '#0d0820' : 'rgba(13,8,32,0.6)',
                              lineHeight: 1,
                            }}
                          >
                            {num}
                          </span>
                        )}
                        {isHint && (
                          <span style={{
                            position: 'absolute', bottom: 2, right: 2,
                            width: 4, height: 4, borderRadius: '50%',
                            background: '#9B7FCC', opacity: 0.7,
                          }} />
                        )}
                        {grid[r]?.[c] || ''}
                      </div>
                    )
                  })}

                  {phase === 'checking' && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(8,6,20,0.7)',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 5,
                      }}
                    >
                      <div style={{ color: '#E8D5A3', fontSize: 14 }}>
                        <span style={{ animation: 'cwSpin 1s linear infinite', display: 'inline-block', marginRight: 8 }}>
                          ✨
                        </span>
                        Checking…
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={submitPuzzle}
                    disabled={phase === 'checking'}
                    style={{
                      padding: '12px 32px',
                      borderRadius: 12,
                      border: 'none',
                      background: allFilled
                        ? 'linear-gradient(135deg, #C9A84C 0%, #E8D5A3 50%, #C9A84C 100%)'
                        : 'rgba(201,168,76,0.18)',
                      color: allFilled ? '#0d0820' : 'rgba(232,213,163,0.5)',
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: '0.04em',
                      cursor: allFilled ? 'pointer' : 'default',
                      boxShadow: allFilled ? '0 4px 20px rgba(201,168,76,0.3)' : 'none',
                      transition: 'all 0.3s',
                    }}
                  >
                    {phase === 'checking' ? '✨ Checking…' : '✓ Submit Puzzle'}
                  </button>
                </div>

                {/* Hidden input to capture mobile keyboard */}
                <input
                  ref={hiddenInputRef}
                  onChange={handleHiddenChange}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: 'none',
                  }}
                />
              </div>

              {/* Clues panel */}
              <div
                style={{
                  flex: '1 1 260px',
                  minWidth: 240,
                  maxWidth: 380,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <CluesList
                  title="Across"
                  clues={puzzle.clues.across}
                  activeNumber={
                    activeWord.clue && direction === 'across' ? activeWord.clue.number : -1
                  }
                  onPick={cl => {
                    setSelected({ row: cl.row, col: cl.col })
                    setDirection('across')
                  }}
                />
                <CluesList
                  title="Down"
                  clues={puzzle.clues.down}
                  activeNumber={
                    activeWord.clue && direction === 'down' ? activeWord.clue.number : -1
                  }
                  onPick={cl => {
                    setSelected({ row: cl.row, col: cl.col })
                    setDirection('down')
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── SOLVED (brief) ── */}
        {phase === 'solved' && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              animation: 'cwFadeUp 0.5s ease-out',
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h3
              style={{
                color: '#E8D5A3',
                fontWeight: 700,
                fontSize: 28,
                marginBottom: 12,
              }}
            >
              Puzzle Solved!
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              {formatTime(finalTime)} · {finalScore} pts
            </p>
          </div>
        )}

        {/* ── LETTER ── */}
        {phase === 'letter' && (
          <LetterReveal
            note={secretNote}
            score={finalScore}
            time={finalTime}
            onReplay={startPuzzle}
          />
        )}
      </div>

      <style>{`
        @keyframes cwTwinkle {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.35; }
        }
        @keyframes cwFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cwSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cwPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes cwEnvelopeIn {
          from { opacity: 0; transform: scale(0.7) translateY(30px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes cwFlapOpen {
          from { transform: rotateX(0deg); }
          to { transform: rotateX(-160deg); }
        }
        @keyframes cwLetterSlideUp {
          from { opacity: 0; transform: translateY(60px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cwTypeIn {
          from { opacity: 0; filter: blur(4px); }
          to { opacity: 1; filter: blur(0); }
        }
      `}</style>
    </section>
  )
}

// ── Clue list ─────────────────────────────────────────────────────
function CluesList({
  title,
  clues,
  activeNumber,
  onPick,
}: {
  title: string
  clues: ClueInfo[]
  activeNumber: number
  onPick: (c: ClueInfo) => void
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(201,168,76,0.15)',
        borderRadius: 12,
        padding: '12px 10px',
        maxHeight: 400,
        overflowY: 'auto',
      }}
    >
      <p
        style={{
          fontSize: 10,
          letterSpacing: '0.25em',
          color: 'rgba(201,168,76,0.7)',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 8,
          paddingLeft: 6,
        }}
      >
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {clues.map(c => {
          const active = c.number === activeNumber
          return (
            <button
              key={`${title}-${c.number}`}
              onClick={() => onPick(c)}
              style={{
                textAlign: 'left',
                padding: '6px 8px',
                borderRadius: 6,
                border: 'none',
                background: active ? 'rgba(201,168,76,0.18)' : 'transparent',
                color: active ? '#E8D5A3' : 'rgba(255,255,255,0.65)',
                fontSize: 12,
                lineHeight: 1.4,
                cursor: 'pointer',
                display: 'flex',
                gap: 6,
              }}
            >
              <span
                style={{
                  color: active ? '#C9A84C' : 'rgba(201,168,76,0.5)',
                  fontWeight: 700,
                  minWidth: 18,
                }}
              >
                {c.number}
              </span>
              <span>{c.clue}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Letter reveal ─────────────────────────────────────────────────
function LetterReveal({
  note,
  score,
  time,
  onReplay,
}: {
  note: string
  score: number
  time: number
  onReplay: () => void
}) {
  const [stage, setStage] = useState<'envelope' | 'opening' | 'letter' | 'text'>('envelope')

  useEffect(() => {
    const t1 = setTimeout(() => setStage('opening'), 500)
    const t2 = setTimeout(() => setStage('letter'), 1500)
    const t3 = setTimeout(() => setStage('text'), 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <div style={{ textAlign: 'center', animation: 'cwFadeUp 0.5s ease-out' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 500,
          margin: '0 auto',
          minHeight: 420,
          perspective: 1000,
        }}
      >
        {/* Envelope */}
        <div
          style={{
            position: 'relative',
            width: 260,
            height: 170,
            margin: '30px auto 0',
            animation: 'cwEnvelopeIn 0.5s ease-out',
            display: stage === 'letter' || stage === 'text' ? 'none' : 'block',
          }}
        >
          {/* Body */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #C9A84C 0%, #E8D5A3 100%)',
              borderRadius: 6,
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            }}
          />
          {/* Flap */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              borderLeft: '130px solid transparent',
              borderRight: '130px solid transparent',
              borderTop: '90px solid #B8973C',
              transformOrigin: 'top center',
              animation: stage === 'opening' ? 'cwFlapOpen 0.8s ease-out forwards' : 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 0,
              height: 0,
              borderLeft: '130px solid transparent',
              borderRight: '130px solid transparent',
              borderBottom: '90px solid #A8873C',
              opacity: 0.6,
            }}
          />
        </div>

        {/* Letter card */}
        {(stage === 'letter' || stage === 'text') && (
          <div
            style={{
              position: 'relative',
              maxWidth: 460,
              margin: '0 auto',
              background: '#fdf8f0',
              borderRadius: 8,
              padding: '48px 36px',
              boxShadow: '0 16px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(201,168,76,0.3)',
              animation: 'cwLetterSlideUp 0.8s ease-out',
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0, transparent 28px, rgba(201,168,76,0.08) 28px, rgba(201,168,76,0.08) 29px)',
              backgroundPositionY: 24,
              border: '1px dashed rgba(201,168,76,0.4)',
            }}
          >
            {/* Corner flowers */}
            <div style={{ position: 'absolute', top: 6, left: 6 }}>
              <FlowerSVG x={0} y={0} size={22} color="#E8856A" />
            </div>
            <div style={{ position: 'absolute', top: 6, right: 6 }}>
              <FlowerSVG x={0} y={0} size={22} color="#C9A84C" />
            </div>
            <div style={{ position: 'absolute', bottom: 6, left: 6 }}>
              <FlowerSVG x={0} y={0} size={20} color="#9B7FCC" />
            </div>
            <div style={{ position: 'absolute', bottom: 6, right: 6 }}>
              <FlowerSVG x={0} y={0} size={20} color="#E8856A" />
            </div>

            <p
              style={{
                fontStyle: 'italic',
                fontFamily: '"Segoe Script", "Brush Script MT", cursive, serif',
                color: '#7a4a3f',
                fontSize: 'clamp(16px, 3vw, 20px)',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                animation: stage === 'text' ? 'cwTypeIn 1.2s ease-out' : 'none',
                opacity: stage === 'text' ? 1 : 0,
                textAlign: 'center',
                margin: 0,
              }}
            >
              {note}
            </p>
          </div>
        )}
      </div>

      {/* Score card */}
      {stage === 'text' && (
        <div
          style={{
            marginTop: 32,
            display: 'inline-block',
            padding: '20px 28px',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: 16,
            animation: 'cwFadeUp 0.6s ease-out 0.5s both',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 20,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: 'rgba(201,168,76,0.7)',
                  textTransform: 'uppercase',
                }}
              >
                Time
              </p>
              <p style={{ color: '#E8D5A3', fontWeight: 700, fontSize: 22 }}>{formatTime(time)}</p>
            </div>
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: 'rgba(201,168,76,0.7)',
                  textTransform: 'uppercase',
                }}
              >
                Score
              </p>
              <p style={{ color: '#E8D5A3', fontWeight: 700, fontSize: 22 }}>{score}</p>
            </div>
          </div>
          <button
            onClick={onReplay}
            style={{
              padding: '10px 24px',
              borderRadius: 12,
              border: '1px solid rgba(201,168,76,0.3)',
              background: 'transparent',
              color: '#E8D5A3',
              cursor: 'pointer',
              fontSize: 13,
              letterSpacing: '0.03em',
            }}
          >
            Play Again? →
          </button>
        </div>
      )}
    </div>
  )
}
