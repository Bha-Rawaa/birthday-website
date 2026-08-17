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
    const [visitorsRes, tagsRes] = await Promise.all([
      admin
        .from('visitors')
        .select('id, name, entered_at', { count: 'exact' })
        .order('entered_at', { ascending: false }),
      admin
        .from('one_word_tags')
        .select('word, created_at')
        .order('created_at', { ascending: true }),
    ])

    if (visitorsRes.error) return NextResponse.json({ error: visitorsRes.error.message }, { status: 500 })

    const tags: { word: string; created_at: string }[] = tagsRes.data ?? []
    const usedTagIndices = new Set<number>()

    const visitors = (visitorsRes.data ?? []).map((v) => {
      const vTime = new Date(v.entered_at).getTime()
      let bestIdx = -1
      let bestDiff = Infinity
      tags.forEach((t, i) => {
        if (usedTagIndices.has(i)) return
        const diff = Math.abs(new Date(t.created_at).getTime() - vTime)
        if (diff < bestDiff && diff < 30000) {
          bestDiff = diff
          bestIdx = i
        }
      })
      let word: string | null = null
      if (bestIdx !== -1) {
        word = tags[bestIdx].word
        usedTagIndices.add(bestIdx)
      }
      return { ...v, word }
    })

    return NextResponse.json({ visitors, count: visitorsRes.count ?? 0 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal server error' }, { status: 500 })
  }
}
