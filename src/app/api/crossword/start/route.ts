import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateCrossword, WordEntry } from '@/lib/crosswordGenerator'

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface WordRow {
  id: number
  clue: string
  answer: string
  tag: string
}

export async function POST(req: NextRequest) {
  try {
    const { guestName } = await req.json()
    if (!guestName || typeof guestName !== 'string') {
      return NextResponse.json({ error: 'Missing guestName' }, { status: 400 })
    }

    const admin = makeAdmin()

    // 1. Find guest tag (ilike match)
    let tag = 'default'
    const { data: tagRow } = await admin
      .from('guest_crossword_tags')
      .select('tag')
      .ilike('guest_name', guestName)
      .maybeSingle()
    if (tagRow?.tag) tag = tagRow.tag

    // 2. Load config
    const { data: configRow } = await admin
      .from('crossword_config')
      .select('*')
      .eq('tag', tag)
      .maybeSingle()

    const wordsPerGame: number = configRow?.words_per_game ?? 8
    const fallbackTag: string | null = configRow?.fallback_tag ?? 'default'

    // 3. Fetch active words for tag
    const { data: primaryWords } = await admin
      .from('crossword_words')
      .select('id, clue, answer, tag')
      .eq('tag', tag)
      .eq('is_active', true)

    let allWords: WordRow[] = (primaryWords ?? []) as WordRow[]

    if (allWords.length < wordsPerGame && fallbackTag && fallbackTag !== tag) {
      const { data: fallbackWords } = await admin
        .from('crossword_words')
        .select('id, clue, answer, tag')
        .eq('tag', fallbackTag)
        .eq('is_active', true)
      const existingIds = new Set(allWords.map(w => w.id))
      for (const w of (fallbackWords ?? []) as WordRow[]) {
        if (!existingIds.has(w.id)) allWords.push(w)
      }
    }

    // Sanitize
    allWords = allWords
      .map(w => ({ ...w, answer: (w.answer || '').toUpperCase().replace(/[^A-Z]/g, '') }))
      .filter(w => w.answer.length >= 3)

    if (allWords.length < 3) {
      return NextResponse.json({ error: 'Not enough words configured for this tag' }, { status: 503 })
    }

    // 4. Fetch recently used word_ids for this guest (last 3 attempts)
    const { data: recentAttempts } = await admin
      .from('crossword_attempts')
      .select('id, started_at')
      .ilike('guest_name', guestName)
      .order('started_at', { ascending: false })
      .limit(3)

    const recentAttemptIds = (recentAttempts ?? []).map(a => a.id)
    let recentWordIds = new Set<number>()
    if (recentAttemptIds.length > 0) {
      const { data: recentUsed } = await admin
        .from('crossword_attempt_words')
        .select('word_id, attempt_id')
        .in('attempt_id', recentAttemptIds)
      recentWordIds = new Set((recentUsed ?? []).map(r => r.word_id as number))
    }

    // 5. Sort: unused first, then recent
    const unused = allWords.filter(w => !recentWordIds.has(w.id))
    const usedRecently = allWords.filter(w => recentWordIds.has(w.id))
    const sorted = [...unused, ...usedRecently]

    // 6. Take top candidates, shuffle, pick
    const candidatePool = sorted.slice(0, Math.max(wordsPerGame * 2, wordsPerGame))

    // 7. Try up to 5 times to generate a valid puzzle
    let layout = null
    let selection: WordRow[] = []
    for (let attempt = 0; attempt < 5; attempt++) {
      const shuffled = shuffle(candidatePool)
      selection = shuffled.slice(0, Math.min(wordsPerGame, shuffled.length))
      const entries: WordEntry[] = selection.map(w => ({ id: w.id, answer: w.answer, clue: w.clue }))
      const generated = generateCrossword(entries)
      if (generated && generated.placed.length >= 3) {
        layout = generated
        break
      }
    }

    if (!layout) {
      return NextResponse.json({ error: 'Could not generate a valid crossword' }, { status: 500 })
    }

    // 9. Create attempt
    const { data: attemptRow, error: attemptErr } = await admin
      .from('crossword_attempts')
      .insert({ guest_name: guestName, tag, status: 'in_progress' })
      .select('id, started_at')
      .single()

    if (attemptErr || !attemptRow) {
      return NextResponse.json({ error: attemptErr?.message ?? 'Could not create attempt' }, { status: 500 })
    }

    const attemptId: string = attemptRow.id

    // 10. Insert attempt_words
    const attemptWordRows = layout.placed.map(p => ({
      attempt_id: attemptId,
      word_id: p.wordId,
      answer: p.answer,
      clue: p.clue,
      direction: p.direction,
      start_row: p.startRow,
      start_col: p.startCol,
      word_number: p.wordNumber,
    }))

    const { error: insErr } = await admin.from('crossword_attempt_words').insert(attemptWordRows)
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    // 11a. Build hints: first + middle letter for 3 evenly-spread words
    const hintWords = (() => {
      const n = layout.placed.length
      if (n <= 3) return layout.placed.slice(0, 3)
      const step = Math.floor(n / 3)
      return [layout.placed[0], layout.placed[step], layout.placed[n - 1]]
    })()

    const hints: { row: number; col: number; letter: string }[] = []
    for (const p of hintWords) {
      const positions = [0, Math.floor(p.answer.length / 2)]
      for (const idx of positions) {
        const r = p.direction === 'across' ? p.startRow : p.startRow + idx
        const c = p.direction === 'across' ? p.startCol + idx : p.startCol
        hints.push({ row: r, col: c, letter: p.answer[idx] })
      }
    }
    // Deduplicate by cell key
    const seenHints = new Set<string>()
    const uniqueHints = hints.filter(h => {
      const k = `${h.row},${h.col}`
      if (seenHints.has(k)) return false
      seenHints.add(k)
      return true
    })

    // 11b. Build response (without answers)
    const cellsMap = new Map<string, { row: number; col: number; number?: number }>()
    for (const p of layout.placed) {
      for (let i = 0; i < p.answer.length; i++) {
        const r = p.direction === 'across' ? p.startRow : p.startRow + i
        const c = p.direction === 'across' ? p.startCol + i : p.startCol
        const key = `${r},${c}`
        if (!cellsMap.has(key)) cellsMap.set(key, { row: r, col: c })
      }
    }
    // Attach numbers to word-start cells
    for (const p of layout.placed) {
      const key = `${p.startRow},${p.startCol}`
      const cell = cellsMap.get(key)
      if (cell) cell.number = p.wordNumber
    }

    const cells = [...cellsMap.values()]

    const across = layout.placed
      .filter(p => p.direction === 'across')
      .map(p => ({
        number: p.wordNumber,
        clue: p.clue,
        length: p.answer.length,
        row: p.startRow,
        col: p.startCol,
      }))
      .sort((a, b) => a.number - b.number)

    const down = layout.placed
      .filter(p => p.direction === 'down')
      .map(p => ({
        number: p.wordNumber,
        clue: p.clue,
        length: p.answer.length,
        row: p.startRow,
        col: p.startCol,
      }))
      .sort((a, b) => a.number - b.number)

    return NextResponse.json({
      attemptId,
      startedAt: attemptRow.started_at,
      tag,
      gridRows: layout.gridRows,
      gridCols: layout.gridCols,
      cells,
      clues: { across, down },
      wordCount: layout.placed.length,
      hints: uniqueHints,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
