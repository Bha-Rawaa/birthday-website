import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import sharp from 'sharp'

function makeAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin env vars')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// Remove emoji / non-WinAnsi characters so pdf-lib doesn't crash
function pdfSafe(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')  // emoji block
    .replace(/[\u{2600}-\u{27BF}]/gu, '')     // misc symbols & dingbats
    .replace(/[^\x00-\xFF]/g, '')              // anything outside Latin-1
    .replace(/\s+/g, ' ')
    .trim()
}

function parseMessage(raw: string): { text: string; gifUrl: string | null } {
  const idx = raw.indexOf('\n__GIF__:')
  if (idx === -1) return { text: raw, gifUrl: null }
  return { text: raw.slice(0, idx), gifUrl: raw.slice(idx + 9) }
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const png = await sharp(buf).png().toBuffer()
    return new Uint8Array(png)
  } catch {
    return null
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + (current ? ' ' : '') + word).length <= maxChars) {
      current += (current ? ' ' : '') + word
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

const ACCENT = rgb(0.957, 0.396, 0.306)
const GOLD   = rgb(0.957, 0.663, 0.235)
const DARK   = rgb(0.141, 0.118, 0.239)
const WHITE  = rgb(1, 1, 1)
const LGRAY  = rgb(0.92, 0.92, 0.92)

export async function GET() {
  const admin = makeAdmin()

  const { data: memories } = await admin
    .from('memories')
    .select('*')
    .order('created_at', { ascending: true })

  const pdfDoc = await PDFDocument.create()
  const boldFont    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const italicFont  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const W = 595
  const H = 842

  // ── COVER PAGE ──────────────────────────────────────────────────────────
  const cover = pdfDoc.addPage([W, H])
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DARK })

  // Star sprinkles (pseudo-random, no emojis)
  const rng = (seed: number) => ((seed * 9301 + 49297) % 233280) / 233280
  for (let i = 0; i < 60; i++) {
    cover.drawCircle({
      x: rng(i * 17 + 3) * W,
      y: rng(i * 13 + 7) * H,
      size: rng(i * 5 + 1) * 2 + 0.5,
      color: rgb(1, 1, 1),
      opacity: 0.15 + rng(i) * 0.25,
    })
  }

  // Decorative golden circles instead of lion emoji
  cover.drawCircle({ x: W / 2, y: H - 155, size: 38, color: GOLD, opacity: 0.25 })
  cover.drawCircle({ x: W / 2, y: H - 155, size: 24, color: GOLD, opacity: 0.6 })
  cover.drawText('R', { x: W / 2 - 14, y: H - 168, size: 32, font: boldFont, color: DARK })

  cover.drawText("Rawaa's Birthday", {
    x: W / 2 - 128, y: H - 255, size: 32, font: boldFont, color: GOLD,
  })
  cover.drawText('Memory Book', {
    x: W / 2 - 90, y: H - 297, size: 26, font: boldFont, color: WHITE,
  })
  cover.drawText('~ 26th Birthday ~', {
    x: W / 2 - 78, y: H - 336, size: 14, font: italicFont, color: rgb(0.9, 0.8, 1),
  })

  // Horizontal gold line
  cover.drawLine({
    start: { x: W / 2 - 100, y: H - 365 },
    end:   { x: W / 2 + 100, y: H - 365 },
    thickness: 1,
    color: GOLD,
    opacity: 0.4,
  })

  const memCount = (memories || []).length
  cover.drawText(`${memCount} ${memCount === 1 ? 'memory' : 'memories'} from people who love you`, {
    x: W / 2 - 138, y: H / 2 - 20, size: 13, font: regularFont, color: rgb(0.8, 0.7, 1),
  })

  const dateLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  cover.drawText(dateLabel, {
    x: W / 2 - 58, y: 80, size: 11, font: italicFont, color: rgb(0.6, 0.55, 0.75),
  })

  // ── MEMORY PAGES ────────────────────────────────────────────────────────
  for (const mem of memories ?? []) {
    const page = pdfDoc.addPage([W, H])

    // Cream background
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 0.984, 0.937) })

    // Top accent bar
    page.drawRectangle({ x: 0, y: H - 52, width: W, height: 52, color: DARK })

    page.drawText(pdfSafe(mem.name || 'Anonymous'), {
      x: 28, y: H - 36, size: 18, font: boldFont, color: GOLD,
    })

    const dateStr = new Date(mem.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
    page.drawText(dateStr, {
      x: W - 110, y: H - 36, size: 11, font: italicFont, color: rgb(0.7, 0.65, 0.85),
    })

    const { text, gifUrl } = parseMessage(mem.message || '')
    const isPrivate = !mem.is_public

    if (isPrivate) {
      page.drawRectangle({ x: W - 110, y: H - 76, width: 88, height: 18, color: ACCENT })
      page.drawText('Private', { x: W - 100, y: H - 71, size: 9, font: boldFont, color: WHITE })
    }

    // Message body (strip emojis for safe rendering)
    let curY = H - 90
    const MSG_FONT_SIZE = 13
    const cleanText = pdfSafe(text || '(no message)')
    const lines = wrapText(cleanText || '(no message)', 64)
    for (const line of lines) {
      if (!line.trim()) continue
      page.drawText(line, { x: 36, y: curY, size: MSG_FONT_SIZE, font: regularFont, color: DARK })
      curY -= MSG_FONT_SIZE + 5
    }
    curY -= 12

    // Photo or GIF image
    let imgBytes: Uint8Array | null = null

    if (mem.photo_path) {
      const { data: blob } = await admin.storage.from('photos').download(mem.photo_path)
      if (blob) {
        const raw = Buffer.from(await blob.arrayBuffer())
        try {
          imgBytes = new Uint8Array(
            await sharp(raw).resize({ width: 480, withoutEnlargement: true }).png().toBuffer()
          )
        } catch { /* skip */ }
      }
    } else if (gifUrl) {
      imgBytes = await fetchImageBytes(gifUrl)
    }

    if (imgBytes) {
      try {
        const embedded = await pdfDoc.embedPng(imgBytes)
        const maxW = W - 72
        const maxH = Math.min(300, Math.max(100, curY - 60))
        const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1)
        const iW = embedded.width * scale
        const iH = embedded.height * scale
        const iX = (W - iW) / 2
        const iY = curY - iH

        // Shadow
        page.drawRectangle({ x: iX + 3, y: iY - 3, width: iW, height: iH, color: rgb(0.7, 0.7, 0.7), opacity: 0.3 })
        page.drawImage(embedded, { x: iX, y: iY, width: iW, height: iH })

        if (gifUrl) {
          page.drawText('GIF snapshot', {
            x: iX + 4, y: iY + 5, size: 8, font: italicFont, color: rgb(0.5, 0.5, 0.5),
          })
        }
        curY = iY - 16
      } catch { /* skip bad image */ }
    }

    // Bottom divider + page accent
    page.drawRectangle({ x: 36, y: 30, width: W - 72, height: 1, color: LGRAY })
    page.drawCircle({ x: W / 2, y: 20, size: 4, color: GOLD, opacity: 0.5 })
  }

  const pdfBytes = await pdfDoc.save()
  const today = new Date().toISOString().slice(0, 10)

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rawaa-birthday-memories-${today}.pdf"`,
    },
  })
}
