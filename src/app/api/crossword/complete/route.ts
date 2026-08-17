import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

interface SubmittedAnswer {
  wordNumber: number
  direction: string
  answer: string
}

export async function POST(req: NextRequest) {
  try {
    const { attemptId, answers } = (await req.json()) as {
      attemptId: string
      answers: SubmittedAnswer[]
    }
    if (!attemptId || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const admin = makeAdmin()

    // Load attempt
    const { data: attempt, error: aerr } = await admin
      .from('crossword_attempts')
      .select('id, tag, started_at, status')
      .eq('id', attemptId)
      .maybeSingle()

    if (aerr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    // Load stored words
    const { data: storedWords, error: swerr } = await admin
      .from('crossword_attempt_words')
      .select('word_number, direction, answer')
      .eq('attempt_id', attemptId)

    if (swerr || !storedWords) {
      return NextResponse.json({ error: 'Could not load attempt words' }, { status: 500 })
    }

    // Compare
    const wrong: { wordNumber: number; direction: string }[] = []
    for (const sw of storedWords) {
      const submitted = answers.find(
        a => a.wordNumber === sw.word_number && a.direction === sw.direction
      )
      const submittedAns = (submitted?.answer ?? '').toUpperCase().replace(/[^A-Z]/g, '')
      const storedAns = (sw.answer as string).toUpperCase()
      if (submittedAns !== storedAns) {
        wrong.push({ wordNumber: sw.word_number as number, direction: sw.direction as string })
      }
    }

    if (wrong.length > 0) {
      return NextResponse.json({ success: false, wrong })
    }

    // All correct
    const startedAt = new Date(attempt.started_at as string).getTime()
    const now = Date.now()
    const elapsedSeconds = Math.max(1, Math.floor((now - startedAt) / 1000))
    const score = Math.max(0, 1000 - elapsedSeconds * 2)

    await admin
      .from('crossword_attempts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        elapsed_seconds: elapsedSeconds,
        score,
      })
      .eq('id', attemptId)

    // Fetch secret note
    const { data: configRow } = await admin
      .from('crossword_config')
      .select('secret_note')
      .eq('tag', attempt.tag)
      .maybeSingle()

    const secretNote: string = configRow?.secret_note ?? 'You solved it! 🎉'

    return NextResponse.json({
      success: true,
      score,
      elapsed_seconds: elapsedSeconds,
      secretNote,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
