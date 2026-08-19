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

function pdfSafe(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\x00-\xFF]/g, '')
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
    const png = await sharp(buf).resize({ width: 400, withoutEnlargement: true }).png().toBuffer()
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
const CREAM  = rgb(1, 0.984, 0.937)

export async function GET() {
  const admin = makeAdmin()

  // Fetch all data in parallel
  const [memoriesRes, quizRes, visitorsRes, tagsRes] = await Promise.all([
    admin.from('memories').select('*').order('created_at', { ascending: true }),
    admin.from('quiz_attempts').select('guest_name, score').not('completed_at', 'is', null),
    admin.from('visitors').select('id, name, entered_at').order('entered_at', { ascending: false }),
    admin.from('one_word_tags').select('word, created_at').order('created_at', { ascending: true }),
  ])

  const memories = memoriesRes.data ?? []
  const quizAttempts = quizRes.data ?? []
  const visitors = visitorsRes.data ?? []
  const tags: { word: string; created_at: string }[] = tagsRes.data ?? []

  // Build name -> best quiz score map (case-insensitive)
  const scoreMap = new Map<string, number>()
  for (const a of quizAttempts) {
    const key = (a.guest_name as string).toLowerCase()
    const prev = scoreMap.get(key) ?? 0
    if ((a.score as number) > prev) scoreMap.set(key, a.score as number)
  }

  // Build visitor name -> word map (time-based matching within 30s)
  const usedTagIndices = new Set<number>()
  const wordMap = new Map<string, string>()
  for (const v of visitors) {
    const vTime = new Date(v.entered_at).getTime()
    let bestIdx = -1
    let bestDiff = Infinity
    tags.forEach((t, i) => {
      if (usedTagIndices.has(i)) return
      const diff = Math.abs(new Date(t.created_at).getTime() - vTime)
      if (diff < bestDiff && diff < 30000) { bestDiff = diff; bestIdx = i }
    })
    if (bestIdx !== -1) {
      wordMap.set(v.name.toLowerCase(), pdfSafe(tags[bestIdx].word))
      usedTagIndices.add(bestIdx)
    }
  }

  const pdfDoc = await PDFDocument.create()
  const boldFont    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const italicFont  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const W = 595
  const H = 842
  const MARGIN = 36
  const MIN_Y = 50

  // ── COVER PAGE ──────────────────────────────────────────────────────────
  const cover = pdfDoc.addPage([W, H])
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: DARK })

  const rng = (seed: number) => ((seed * 9301 + 49297) % 233280) / 233280
  for (let i = 0; i < 60; i++) {
    cover.drawCircle({
      x: rng(i * 17 + 3) * W, y: rng(i * 13 + 7) * H,
      size: rng(i * 5 + 1) * 2 + 0.5, color: WHITE,
      opacity: 0.15 + rng(i) * 0.25,
    })
  }

  cover.drawCircle({ x: W / 2, y: H - 155, size: 38, color: GOLD, opacity: 0.25 })
  cover.drawCircle({ x: W / 2, y: H - 155, size: 24, color: GOLD, opacity: 0.6 })
  cover.drawText('R', { x: W / 2 - 14, y: H - 168, size: 32, font: boldFont, color: DARK })

  cover.drawText("Rawaa's Birthday", { x: W / 2 - 128, y: H - 255, size: 32, font: boldFont, color: GOLD })
  cover.drawText('Memory Book', { x: W / 2 - 90, y: H - 297, size: 26, font: boldFont, color: WHITE })
  cover.drawText('~ 26th Birthday ~', { x: W / 2 - 78, y: H - 336, size: 14, font: italicFont, color: rgb(0.9, 0.8, 1) })

  cover.drawLine({
    start: { x: W / 2 - 100, y: H - 365 }, end: { x: W / 2 + 100, y: H - 365 },
    thickness: 1, color: GOLD, opacity: 0.4,
  })

  cover.drawText(`${memories.length} ${memories.length === 1 ? 'memory' : 'memories'} from people who love you`, {
    x: W / 2 - 138, y: H / 2 - 20, size: 13, font: regularFont, color: rgb(0.8, 0.7, 1),
  })

  const dateLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  cover.drawText(dateLabel, { x: W / 2 - 58, y: 80, size: 11, font: italicFont, color: rgb(0.6, 0.55, 0.75) })

  // ── MEMORY PAGES (flow layout) ──────────────────────────────────────────
  // Pre-fetch all images so we can calculate heights before drawing
  type MemEntry = {
    name: string
    score: number | null
    word: string | null
    text: string
    isPrivate: boolean
    dateStr: string
    imgBytes: Uint8Array | null
    imgAspect: number
  }

  const entries: MemEntry[] = await Promise.all(
    memories.map(async (mem) => {
      const { text, gifUrl } = parseMessage(mem.message || '')
      let imgBytes: Uint8Array | null = null
      let imgAspect = 1

      if (mem.photo_path) {
        const { data: blob } = await admin.storage.from('photos').download(mem.photo_path)
        if (blob) {
          const raw = Buffer.from(await blob.arrayBuffer())
          try {
            const meta = await sharp(raw).metadata()
            imgAspect = meta.width && meta.height ? meta.width / meta.height : 1
            imgBytes = new Uint8Array(
              await sharp(raw).resize({ width: 400, withoutEnlargement: true }).png().toBuffer()
            )
          } catch { /* skip */ }
        }
      } else if (gifUrl) {
        imgBytes = await fetchImageBytes(gifUrl)
        if (imgBytes) {
          try {
            const meta = await sharp(Buffer.from(imgBytes)).metadata()
            imgAspect = meta.width && meta.height ? meta.width / meta.height : 1
          } catch { /* ignore */ }
        }
      }

      const nameKey = (mem.name || '').toLowerCase()
      return {
        name: mem.name || 'Anonymous',
        score: scoreMap.get(nameKey) ?? null,
        word: wordMap.get(nameKey) ?? null,
        text: pdfSafe(text || '(no message)'),
        isPrivate: !mem.is_public,
        dateStr: new Date(mem.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        imgBytes,
        imgAspect,
      }
    })
  )

  // Layout constants
  const IMG_W = 150        // photo column width
  const IMG_GAP = 14       // gap between photo and text
  const TEXT_X_WITH_IMG = MARGIN + IMG_W + IMG_GAP
  const TEXT_W_WITH_IMG = W - TEXT_X_WITH_IMG - MARGIN
  const TEXT_W_NO_IMG = W - MARGIN * 2
  const HEADER_H = 22      // name row height
  const BADGE_ROW_H = 18   // score/word badge row
  const LINE_H = 16        // text line height
  const CARD_PAD_TOP = 10
  const CARD_PAD_BOT = 18
  const CARD_SEP = 28      // space between cards
  const DIVIDER_H = 1

  // Estimate card height
  function cardHeight(entry: MemEntry): number {
    const charsPerLine = entry.imgBytes
      ? Math.floor(TEXT_W_WITH_IMG / 7.2)
      : Math.floor(TEXT_W_NO_IMG / 7.2)
    const lines = wrapText(entry.text, charsPerLine)
    const textH = lines.length * LINE_H
    const metaH = HEADER_H + BADGE_ROW_H + 6
    const contentH = Math.max(entry.imgBytes ? IMG_W / entry.imgAspect : 0, metaH + textH)
    return CARD_PAD_TOP + contentH + CARD_PAD_BOT + DIVIDER_H
  }

  let page = pdfDoc.addPage([W, H])
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM })

  // Page header
  page.drawRectangle({ x: 0, y: H - 38, width: W, height: 38, color: DARK })
  page.drawText('Memories', { x: MARGIN, y: H - 26, size: 15, font: boldFont, color: GOLD })

  let curY = H - 38 - CARD_PAD_TOP

  for (const entry of entries) {
    const ch = cardHeight(entry)

    // Need a new page?
    if (curY - ch < MIN_Y) {
      page = pdfDoc.addPage([W, H])
      page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM })
      page.drawRectangle({ x: 0, y: H - 38, width: W, height: 38, color: DARK })
      page.drawText('Memories', { x: MARGIN, y: H - 26, size: 15, font: boldFont, color: GOLD })
      curY = H - 38 - CARD_PAD_TOP
    }

    const cardTop = curY
    const charsPerLine = entry.imgBytes
      ? Math.floor(TEXT_W_WITH_IMG / 7.2)
      : Math.floor(TEXT_W_NO_IMG / 7.2)
    const textLines = wrapText(entry.text, charsPerLine)

    // --- Name row ---
    page.drawText(pdfSafe(entry.name), {
      x: MARGIN, y: cardTop - 4, size: 13, font: boldFont, color: DARK,
    })
    page.drawText(entry.dateStr, {
      x: W - MARGIN - 90, y: cardTop - 4, size: 9, font: italicFont, color: rgb(0.55, 0.5, 0.65),
    })

    // --- Badge row: score + word ---
    let badgeX = MARGIN
    const badgeY = cardTop - HEADER_H - 4

    if (entry.score !== null) {
      const scoreLabel = `Quiz score: ${entry.score}`
      const badgeW = scoreLabel.length * 5.5 + 10
      page.drawRectangle({ x: badgeX, y: badgeY - 3, width: badgeW, height: 14, color: GOLD, opacity: 0.25, borderColor: GOLD, borderWidth: 0.5 })
      page.drawText(scoreLabel, { x: badgeX + 5, y: badgeY, size: 8, font: boldFont, color: DARK })
      badgeX += badgeW + 6
    }

    if (entry.word) {
      const wordLabel = `"${pdfSafe(entry.word)}"`
      const badgeW = wordLabel.length * 5.5 + 10
      page.drawRectangle({ x: badgeX, y: badgeY - 3, width: badgeW, height: 14, color: ACCENT, opacity: 0.15, borderColor: ACCENT, borderWidth: 0.5 })
      page.drawText(wordLabel, { x: badgeX + 5, y: badgeY, size: 8, font: boldFont, color: ACCENT })
    }

    if (entry.isPrivate) {
      const privLabel = 'Private'
      const privW = privLabel.length * 5.5 + 10
      page.drawRectangle({ x: W - MARGIN - privW, y: badgeY - 3, width: privW, height: 14, color: ACCENT })
      page.drawText(privLabel, { x: W - MARGIN - privW + 5, y: badgeY, size: 8, font: boldFont, color: WHITE })
    }

    // --- Photo on left ---
    const contentStartY = cardTop - HEADER_H - BADGE_ROW_H - 10
    let imageBottomY = contentStartY  // tracks lowest point of photo

    if (entry.imgBytes) {
      try {
        const embedded = await pdfDoc.embedPng(entry.imgBytes)
        const imgH = Math.min(IMG_W / entry.imgAspect, 200)
        const iW = imgH * entry.imgAspect > IMG_W ? IMG_W : imgH * entry.imgAspect
        const iH = iW / entry.imgAspect

        // Shadow
        page.drawRectangle({ x: MARGIN + 2, y: contentStartY - iH - 2, width: iW, height: iH, color: rgb(0.7, 0.7, 0.7), opacity: 0.25 })
        page.drawImage(embedded, { x: MARGIN, y: contentStartY - iH, width: iW, height: iH })
        imageBottomY = contentStartY - iH
      } catch { /* skip bad image */ }
    }

    // --- Text beside photo ---
    const textX = entry.imgBytes ? TEXT_X_WITH_IMG : MARGIN
    let textY = contentStartY
    for (const line of textLines) {
      if (!line.trim()) { textY -= LINE_H * 0.5; continue }
      if (textY < MIN_Y + 10) break
      page.drawText(line, { x: textX, y: textY, size: 10, font: regularFont, color: DARK })
      textY -= LINE_H
    }

    // --- Divider: place below the lowest of photo bottom or text bottom ---
    const contentBottomY = Math.min(imageBottomY, textY)
    const divY = contentBottomY - CARD_PAD_BOT
    page.drawLine({
      start: { x: MARGIN, y: divY },
      end: { x: W - MARGIN, y: divY },
      thickness: 0.5, color: LGRAY,
    })
    page.drawCircle({ x: W / 2, y: divY - 5, size: 2.5, color: GOLD, opacity: 0.5 })

    curY -= ch + CARD_SEP
  }

  // ── ALL GUESTS SUMMARY PAGE ─────────────────────────────────────────────
  // Build full guest list: every visitor, whether or not they left a memory
  const memoryNames = new Set(memories.map(m => (m.name || '').toLowerCase()))

  // Collect all visitors with their word + score
  type GuestRow = { name: string; word: string | null; score: number | null; hasMemory: boolean }
  const guestRows: GuestRow[] = []
  const usedTagIndices2 = new Set<number>()

  for (const v of visitors) {
    const vTime = new Date(v.entered_at).getTime()
    let bestIdx = -1
    let bestDiff = Infinity
    tags.forEach((t, i) => {
      if (usedTagIndices2.has(i)) return
      const diff = Math.abs(new Date(t.created_at).getTime() - vTime)
      if (diff < bestDiff && diff < 30000) { bestDiff = diff; bestIdx = i }
    })
    let word: string | null = null
    if (bestIdx !== -1) {
      word = pdfSafe(tags[bestIdx].word)
      usedTagIndices2.add(bestIdx)
    }
    const nameKey = v.name.toLowerCase()
    guestRows.push({
      name: v.name,
      word,
      score: scoreMap.get(nameKey) ?? null,
      hasMemory: memoryNames.has(nameKey),
    })
  }

  // Sort: guests without memory first (they need the spotlight), then alphabetical
  guestRows.sort((a, b) => {
    if (a.hasMemory !== b.hasMemory) return a.hasMemory ? 1 : -1
    return a.name.localeCompare(b.name)
  })

  const ROW_H = 22
  const COL_NAME = MARGIN
  const COL_WORD = MARGIN + 200
  const COL_SCORE = MARGIN + 360
  const COL_NOTE = MARGIN + 430

  // Summary pages
  let sPage = pdfDoc.addPage([W, H])
  sPage.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM })
  sPage.drawRectangle({ x: 0, y: H - 52, width: W, height: 52, color: DARK })
  sPage.drawText('All Guests', { x: MARGIN, y: H - 30, size: 18, font: boldFont, color: GOLD })
  sPage.drawText('Everyone who showed up to celebrate', {
    x: MARGIN, y: H - 46, size: 9, font: italicFont, color: rgb(0.7, 0.65, 0.85),
  })

  // Column headers
  let sY = H - 52 - 14
  sPage.drawText('Name', { x: COL_NAME, y: sY, size: 9, font: boldFont, color: rgb(0.5, 0.45, 0.6) })
  sPage.drawText('Word', { x: COL_WORD, y: sY, size: 9, font: boldFont, color: rgb(0.5, 0.45, 0.6) })
  sPage.drawText('Score', { x: COL_SCORE, y: sY, size: 9, font: boldFont, color: rgb(0.5, 0.45, 0.6) })
  sPage.drawText('Memory', { x: COL_NOTE, y: sY, size: 9, font: boldFont, color: rgb(0.5, 0.45, 0.6) })
  sY -= 4
  sPage.drawLine({ start: { x: MARGIN, y: sY }, end: { x: W - MARGIN, y: sY }, thickness: 0.5, color: LGRAY })
  sY -= ROW_H * 0.6

  for (let i = 0; i < guestRows.length; i++) {
    const g = guestRows[i]

    if (sY < MIN_Y + ROW_H) {
      sPage = pdfDoc.addPage([W, H])
      sPage.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM })
      sPage.drawRectangle({ x: 0, y: H - 38, width: W, height: 38, color: DARK })
      sPage.drawText('All Guests (continued)', { x: MARGIN, y: H - 26, size: 15, font: boldFont, color: GOLD })
      sY = H - 38 - 14
      // Re-draw column headers
      sPage.drawText('Name', { x: COL_NAME, y: sY, size: 9, font: boldFont, color: rgb(0.5, 0.45, 0.6) })
      sPage.drawText('Word', { x: COL_WORD, y: sY, size: 9, font: boldFont, color: rgb(0.5, 0.45, 0.6) })
      sPage.drawText('Score', { x: COL_SCORE, y: sY, size: 9, font: boldFont, color: rgb(0.5, 0.45, 0.6) })
      sPage.drawText('Memory', { x: COL_NOTE, y: sY, size: 9, font: boldFont, color: rgb(0.5, 0.45, 0.6) })
      sY -= 4
      sPage.drawLine({ start: { x: MARGIN, y: sY }, end: { x: W - MARGIN, y: sY }, thickness: 0.5, color: LGRAY })
      sY -= ROW_H * 0.6
    }

    // Alternating row background
    if (i % 2 === 0) {
      sPage.drawRectangle({ x: MARGIN - 4, y: sY - 5, width: W - MARGIN * 2 + 8, height: ROW_H - 2, color: GOLD, opacity: 0.06 })
    }

    sPage.drawText(pdfSafe(g.name), { x: COL_NAME, y: sY, size: 10, font: boldFont, color: DARK })
    sPage.drawText(g.word ? `"${g.word}"` : '—', { x: COL_WORD, y: sY, size: 10, font: regularFont, color: g.word ? ACCENT : rgb(0.7, 0.7, 0.7) })
    sPage.drawText(g.score !== null ? String(g.score) : '—', { x: COL_SCORE, y: sY, size: 10, font: regularFont, color: g.score !== null ? DARK : rgb(0.7, 0.7, 0.7) })
    sPage.drawText(g.hasMemory ? 'Yes' : 'No', { x: COL_NOTE, y: sY, size: 10, font: regularFont, color: g.hasMemory ? rgb(0.2, 0.6, 0.3) : rgb(0.7, 0.7, 0.7) })

    sY -= ROW_H
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
