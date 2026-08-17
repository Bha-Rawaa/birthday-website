export interface WordEntry {
  id: number
  answer: string // already UPPERCASE
  clue: string
}

export interface PlacedWord {
  wordId: number
  answer: string
  clue: string
  direction: 'across' | 'down'
  startRow: number
  startCol: number
  wordNumber: number // assigned after placement
}

export interface CrosswordLayout {
  placed: PlacedWord[]
  gridRows: number
  gridCols: number
}

// Cell map: "row,col" -> { letter, acrossWordIdx?, downWordIdx? }
type CellMap = Map<string, { letter: string; acrossIdx?: number; downIdx?: number }>

function cellKey(r: number, c: number): string {
  return `${r},${c}`
}

function canPlace(
  cells: CellMap,
  answer: string,
  dir: 'across' | 'down',
  row: number,
  col: number,
  _currentWordIdx: number
): boolean {
  // Check boundary cells (before start and after end must be empty)
  const beforeR = dir === 'across' ? row : row - 1
  const beforeC = dir === 'across' ? col - 1 : col
  if (cells.has(cellKey(beforeR, beforeC))) return false

  const afterR = dir === 'across' ? row : row + answer.length
  const afterC = dir === 'across' ? col + answer.length : col
  if (cells.has(cellKey(afterR, afterC))) return false

  let hasIntersection = false

  for (let i = 0; i < answer.length; i++) {
    const r = dir === 'across' ? row : row + i
    const c = dir === 'across' ? col + i : col
    const key = cellKey(r, c)
    const existing = cells.get(key)

    if (existing) {
      // Cell already has a letter — must match
      if (existing.letter !== answer[i]) return false
      // Must be a crossing (not same direction)
      if (dir === 'across' && existing.acrossIdx !== undefined) return false
      if (dir === 'down' && existing.downIdx !== undefined) return false
      hasIntersection = true
    } else {
      // New cell — check perpendicular adjacency (no parallel words touching)
      if (dir === 'across') {
        if (cells.has(cellKey(r - 1, c)) || cells.has(cellKey(r + 1, c))) return false
      } else {
        if (cells.has(cellKey(r, c - 1)) || cells.has(cellKey(r, c + 1))) return false
      }
    }
  }

  // For words after the first, must have at least one intersection
  if (cells.size > 0 && !hasIntersection) return false

  return true
}

function applyPlacement(
  cells: CellMap,
  answer: string,
  dir: 'across' | 'down',
  row: number,
  col: number,
  wordIdx: number
): void {
  for (let i = 0; i < answer.length; i++) {
    const r = dir === 'across' ? row : row + i
    const c = dir === 'across' ? col + i : col
    const key = cellKey(r, c)
    const existing = cells.get(key)
    cells.set(key, {
      letter: answer[i],
      acrossIdx: dir === 'across' ? wordIdx : existing?.acrossIdx,
      downIdx: dir === 'down' ? wordIdx : existing?.downIdx,
    })
  }
}

export function generateCrossword(words: WordEntry[]): CrosswordLayout | null {
  if (words.length === 0) return null

  // Sort by length descending for better coverage
  const sorted = [...words].sort((a, b) => b.answer.length - a.answer.length)

  const cells: CellMap = new Map()
  const placed: PlacedWord[] = []

  // Place first word horizontally at origin
  const first = sorted[0]
  applyPlacement(cells, first.answer, 'across', 0, 0, 0)
  placed.push({
    wordId: first.id,
    answer: first.answer,
    clue: first.clue,
    direction: 'across',
    startRow: 0,
    startCol: 0,
    wordNumber: 0,
  })

  // Place remaining words
  for (let wi = 1; wi < sorted.length; wi++) {
    const word = sorted[wi]
    const ans = word.answer

    let bestPlacement: { dir: 'across' | 'down'; row: number; col: number; score: number } | null = null

    // Try every intersection with every already-placed word
    for (let pi = 0; pi < placed.length; pi++) {
      const pw = placed[pi]
      const newDir: 'across' | 'down' = pw.direction === 'across' ? 'down' : 'across'

      for (let pwi = 0; pwi < pw.answer.length; pwi++) {
        for (let wi2 = 0; wi2 < ans.length; wi2++) {
          if (pw.answer[pwi] !== ans[wi2]) continue

          // Calculate start position
          let newRow: number
          let newCol: number
          if (newDir === 'down') {
            newRow = (pw.direction === 'across' ? pw.startRow : pw.startRow + pwi) - wi2
            newCol = pw.direction === 'across' ? pw.startCol + pwi : pw.startCol
          } else {
            newRow = pw.direction === 'across' ? pw.startRow : pw.startRow + pwi
            newCol = (pw.direction === 'across' ? pw.startCol + pwi : pw.startCol) - wi2
          }

          if (!canPlace(cells, ans, newDir, newRow, newCol, placed.length)) continue

          // Score: prefer placements that create more intersections
          let score = 0
          for (let i = 0; i < ans.length; i++) {
            const r = newDir === 'across' ? newRow : newRow + i
            const c = newDir === 'across' ? newCol + i : newCol
            if (cells.has(cellKey(r, c))) score++
          }

          if (!bestPlacement || score > bestPlacement.score) {
            bestPlacement = { dir: newDir, row: newRow, col: newCol, score }
          }
        }
      }
    }

    if (bestPlacement) {
      applyPlacement(cells, ans, bestPlacement.dir, bestPlacement.row, bestPlacement.col, placed.length)
      placed.push({
        wordId: word.id,
        answer: ans,
        clue: word.clue,
        direction: bestPlacement.dir,
        startRow: bestPlacement.row,
        startCol: bestPlacement.col,
        wordNumber: 0,
      })
    }
  }

  if (placed.length < 3) return null

  // Normalize coordinates to start at (0,0)
  const allRows = [...cells.keys()].map(k => parseInt(k.split(',')[0]))
  const allCols = [...cells.keys()].map(k => parseInt(k.split(',')[1]))
  const minRow = Math.min(...allRows)
  const minCol = Math.min(...allCols)
  const maxRow = Math.max(...allRows)
  const maxCol = Math.max(...allCols)

  for (const p of placed) {
    p.startRow -= minRow
    p.startCol -= minCol
  }

  const gridRows = maxRow - minRow + 1
  const gridCols = maxCol - minCol + 1

  // Assign crossword numbers: scan left-to-right, top-to-bottom
  const startCells = new Map<string, number>()
  let num = 1

  const wordStarts = placed.map((p, idx) => ({ row: p.startRow, col: p.startCol, wordIdx: idx }))
  wordStarts.sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col))

  const seen = new Set<string>()
  for (const ws of wordStarts) {
    const key = cellKey(ws.row, ws.col)
    if (!seen.has(key)) {
      seen.add(key)
      startCells.set(key, num++)
    }
  }

  for (const p of placed) {
    p.wordNumber = startCells.get(cellKey(p.startRow, p.startCol))!
  }

  return { placed, gridRows, gridCols }
}
