import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a fresh admin client on every request so env vars are always current.
// Module-level singletons can silently capture `undefined` during Next.js cold
// starts before .env.local has been read, producing "Invalid API key" errors.
function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      `Missing Supabase env vars — NEXT_PUBLIC_SUPABASE_URL=${!!url}, SUPABASE_SERVICE_ROLE_KEY=${!!key}`
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET() {
  try {
    const admin = makeAdmin()

    const { data: memories, error } = await admin
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/memories GET] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const memoriesWithUrls = await Promise.all(
      (memories ?? []).map(async (memory) => {
        if (!memory.photo_path) return { ...memory, signedUrl: null }
        try {
          const { data, error: urlError } = await admin.storage
            .from('photos')
            .createSignedUrl(memory.photo_path, 3600)
          if (urlError) console.warn('[admin/memories GET] signed URL error:', memory.photo_path, urlError)
          return { ...memory, signedUrl: data?.signedUrl ?? null }
        } catch (e) {
          console.warn('[admin/memories GET] signed URL threw:', e)
          return { ...memory, signedUrl: null }
        }
      })
    )

    return NextResponse.json({ memories: memoriesWithUrls })
  } catch (e) {
    console.error('[admin/memories GET] fatal:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = makeAdmin()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()
    const { error } = await admin
      .from('memories')
      .update({ is_visible: body.is_visible })
      .eq('id', id)

    if (error) {
      console.error('[admin/memories PATCH] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[admin/memories PATCH] fatal:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = makeAdmin()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { data: memory } = await admin
      .from('memories')
      .select('photo_path')
      .eq('id', id)
      .single()

    if (memory?.photo_path) {
      const { error: storageError } = await admin.storage
        .from('photos')
        .remove([memory.photo_path])
      if (storageError) console.warn('[admin/memories DELETE] storage removal error:', storageError)
    }

    const { error } = await admin.from('memories').delete().eq('id', id)
    if (error) {
      console.error('[admin/memories DELETE] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[admin/memories DELETE] fatal:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
