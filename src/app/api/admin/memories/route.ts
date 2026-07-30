import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const { data: memories, error } = await supabaseAdmin
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const memoriesWithUrls = await Promise.all(
    (memories || []).map(async (memory) => {
      if (memory.photo_path) {
        const { data } = await supabaseAdmin.storage
          .from('photos')
          .createSignedUrl(memory.photo_path, 3600)
        return { ...memory, signedUrl: data?.signedUrl || null }
      }
      return { ...memory, signedUrl: null }
    })
  )

  return NextResponse.json({ memories: memoriesWithUrls })
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await req.json()
  const { error } = await supabaseAdmin
    .from('memories')
    .update({ is_visible: body.is_visible })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: memory } = await supabaseAdmin
    .from('memories')
    .select('photo_path')
    .eq('id', id)
    .single()

  if (memory?.photo_path) {
    await supabaseAdmin.storage.from('photos').remove([memory.photo_path])
  }

  const { error } = await supabaseAdmin.from('memories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
