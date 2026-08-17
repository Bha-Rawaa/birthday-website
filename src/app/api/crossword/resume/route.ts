import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(req: NextRequest) {
  try {
    const attemptId = req.nextUrl.searchParams.get('attemptId')
    if (!attemptId) {
      return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 })
    }

    const admin = makeAdmin()

    const { data: attempt } = await admin
      .from('crossword_attempts')
      .select('id, tag, started_at, status')
      .eq('id', attemptId)
      .maybeSingle()

    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

    const { data: words } = await admin
      .from('crossword_attempt_words')
      .select('word_number, direction, clue, answer, start_row, start_col')
      .eq('attempt_id', attemptId)

    if (!words) return NextResponse.json({ error: 'No words' }, { status: 500 })

    // Reconstruct grid
    const cellsMap = new Map<string, { row: number; col: number; number?: number }>()
    let maxRow = 0
    let maxCol = 0
    for (const w of words) {
      const answer = w.answer as string
      const startRow = w.start_row as number
      const startCol = w.start_col as number
      for (let i = 0; i < answer.length; i++) {
        const r = w.direction === 'across' ? startRow : startRow + i
        const c = w.direction === 'across' ? startCol + i : startCol
        if (r > maxRow) maxRow = r
        if (c > maxCol) maxCol = c
        const key = `${r},${c}`
        if (!cellsMap.has(key)) cellsMap.set(key, { row: r, col: c })
      }
    }
    for (const w of words) {
      const key = `${w.start_row},${w.start_col}`
      const cell = cellsMap.get(key)
      if (cell) cell.number = w.word_number as number
    }

    const cells = [...cellsMap.values()]

    const across = words
      .filter(w => w.direction === 'across')
      .map(w => ({
        number: w.word_number as number,
        clue: w.clue as string,
        length: (w.answer as string).length,
        row: w.start_row as number,
        col: w.start_col as number,
      }))
      .sort((a, b) => a.number - b.number)

    const down = words
      .filter(w => w.direction === 'down')
      .map(w => ({
        number: w.word_number as number,
        clue: w.clue as string,
        length: (w.answer as string).length,
        row: w.start_row as number,
        col: w.start_col as number,
      }))
      .sort((a, b) => a.number - b.number)

    const startedAtMs = new Date(attempt.started_at as string).getTime()
    const elapsedSoFar = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))

    return NextResponse.json({
      attemptId: attempt.id,
      startedAt: attempt.started_at,
      tag: attempt.tag,
      status: attempt.status,
      elapsedSoFar,
      gridRows: maxRow + 1,
      gridCols: maxCol + 1,
      cells,
      clues: { across, down },
      wordCount: words.length,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
