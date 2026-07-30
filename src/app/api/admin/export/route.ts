import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import JSZip from 'jszip'

function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    columns.join(','),
    ...rows.map(r => columns.map(c => escape(r[c])).join(','))
  ].join('\n')
}

export async function GET() {
  const [{ data: memories }, { data: tags }] = await Promise.all([
    supabaseAdmin.from('memories').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('one_word_tags').select('*').order('created_at', { ascending: false }),
  ])

  const zip = new JSZip()
  const photosFolder = zip.folder('photos')!

  zip.file('memories.csv', toCSV(
    (memories || []) as Record<string, unknown>[],
    ['id', 'name', 'message', 'photo_path', 'is_public', 'is_visible', 'created_at']
  ))
  zip.file('one_word_tags.csv', toCSV(
    (tags || []) as Record<string, unknown>[],
    ['id', 'word', 'created_at']
  ))

  await Promise.all(
    (memories || [])
      .filter(m => m.photo_path)
      .map(async (m) => {
        const { data } = await supabaseAdmin.storage.from('photos').download(m.photo_path)
        if (data) {
          const buf = await data.arrayBuffer()
          photosFolder.file(m.photo_path, buf)
        }
      })
  )

  const zipBlob = await zip.generateAsync({ type: 'nodebuffer' })

  return new NextResponse(new Uint8Array(zipBlob), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="birthday-memories-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  })
}
