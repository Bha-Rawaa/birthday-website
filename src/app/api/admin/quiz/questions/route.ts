import { NextRequest, NextResponse } from 'next/server'
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
    const { data, error } = await admin
      .from('quiz_questions')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ questions: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = makeAdmin()
    const body = await req.json()
    const { data, error } = await admin
      .from('quiz_questions')
      .insert(body)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ question: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = makeAdmin()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()
    // Only send known-safe columns, no updated_at which may not exist
    const { question, answers, correct_answer, difficulty, points, display_order, is_active } = body
    const patch: Record<string, unknown> = {}
    if (question !== undefined) patch.question = question
    if (answers !== undefined) patch.answers = answers
    if (correct_answer !== undefined) patch.correct_answer = correct_answer
    if (difficulty !== undefined) patch.difficulty = difficulty
    if (points !== undefined) patch.points = points
    if (display_order !== undefined) patch.display_order = display_order
    if (is_active !== undefined) patch.is_active = is_active

    const { data, error } = await admin
      .from('quiz_questions')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ question: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = makeAdmin()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await admin.from('quiz_questions').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 })
  }
}
