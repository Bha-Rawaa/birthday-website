import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim()
  if (!name) return NextResponse.json({ isReturning: false, visitCount: 0, hasMemory: false })

  try {
    const admin = makeAdmin()
    const [visitRes, memoryRes] = await Promise.all([
      admin
        .from('visitors')
        .select('id', { count: 'exact', head: true })
        .ilike('name', name),
      admin
        .from('memories')
        .select('id', { count: 'exact', head: true })
        .ilike('name', name),
    ])

    const visitCount = visitRes.count ?? 0
    const memoryCount = memoryRes.count ?? 0

    return NextResponse.json({
      isReturning: visitCount > 0,
      visitCount,
      hasMemory: memoryCount > 0,
    })
  } catch {
    return NextResponse.json({ isReturning: false, visitCount: 0, hasMemory: false })
  }
}
