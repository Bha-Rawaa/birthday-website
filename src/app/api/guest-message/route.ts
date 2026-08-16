import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')
  if (!name) return NextResponse.json({ message: null })

  try {
    const admin = makeAdmin()
    const { data, error } = await admin
      .from('guest_messages')
      .select('message')
      .ilike('name', name.trim())
      .maybeSingle()

    if (error) {
      console.error('[guest-message GET]', error)
      return NextResponse.json({ message: null })
    }

    return NextResponse.json({ message: data?.message ?? null })
  } catch (e) {
    console.error('[guest-message GET] fatal:', e)
    return NextResponse.json({ message: null })
  }
}
