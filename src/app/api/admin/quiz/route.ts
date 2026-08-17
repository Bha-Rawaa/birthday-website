import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET() {
  try {
    const admin = makeAdmin()
    const { data: attempts, error } = await admin
      .from('quiz_attempts')
      .select('*')
      .not('completed_at', 'is', null)
      .order('score', { ascending: false })
      .order('correct_answers', { ascending: false })
      .order('completed_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const result = (attempts ?? []).map((a: Record<string, unknown>, idx: number) => ({
      ...a,
      rank: idx + 1,
      qualified: (a.correct_answers as number) >= 9,
      isWinner: idx === 0 && (a.correct_answers as number) >= 9,
    }))

    return NextResponse.json({ attempts: result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 })
  }
}
