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
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = makeAdmin()

    const { data: attempt, error: aErr } = await admin
      .from('quiz_attempts')
      .select('*')
      .eq('id', id)
      .single()

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

    const { data: answers, error: ansErr } = await admin
      .from('quiz_answers')
      .select(`
        id,
        selected_answer,
        is_correct,
        points_earned,
        quiz_questions(id, question, correct_answer)
      `)
      .eq('attempt_id', id)

    if (ansErr) return NextResponse.json({ error: ansErr.message }, { status: 500 })

    return NextResponse.json({ attempt, answers: answers ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 })
  }
}
