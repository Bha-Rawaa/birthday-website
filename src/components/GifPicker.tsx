'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Get a free GIPHY API key at https://developers.giphy.com (takes ~2 min, free tier is plenty).
// Add it to .env.local as NEXT_PUBLIC_GIPHY_API_KEY=your_key_here
const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? ''
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs'

interface GiphyGif {
  id: string
  title: string
  images: {
    fixed_height_small: { url: string; webp: string }
    fixed_height: { url: string }
  }
}

interface Props {
  onSelect: (url: string) => void
  onClose: () => void
}

// ── URL paste fallback (shown when no GIPHY key is configured) ───────────────
function UrlPastePicker({ onSelect, onClose }: Props) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const trimmed = url.trim()
    if (!trimmed) { setError('Please paste a GIF URL'); return }
    if (!/\.(gif|webp)(\?.*)?$/i.test(trimmed) && !trimmed.includes('giphy.com') && !trimmed.includes('tenor.com')) {
      setError('That doesn\'t look like a GIF URL — try right-clicking a GIF and copying the image address')
      return
    }
    onSelect(trimmed)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border-4 border-accent-marigold/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-accent-marigold">🎬 Add a GIF</h3>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600">✕</button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Find a GIF on{' '}
          <a href="https://tenor.com/search/birthday-gifs" target="_blank" rel="noopener noreferrer"
            className="text-accent-marigold underline">Tenor</a>
          {' '}or{' '}
          <a href="https://giphy.com/search/birthday" target="_blank" rel="noopener noreferrer"
            className="text-accent-marigold underline">GIPHY</a>
          , right-click the GIF → <strong>Copy image address</strong>, then paste it below.
        </p>

        <input
          type="url"
          value={url}
          onChange={e => { setUrl(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="https://media.giphy.com/..."
          className="w-full px-4 py-3 rounded-2xl border-2 border-day-gold/50 focus:border-accent-marigold focus:outline-none text-sm mb-2"
          autoFocus
        />
        {error && <p className="text-accent-coral text-xs mb-2">{error}</p>}

        {/* Live preview */}
        {url.trim() && !error && (
          <div className="mb-3 rounded-xl overflow-hidden border border-day-gold/30 max-h-40 bg-gray-50 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url.trim()} alt="GIF preview" className="max-h-40 object-contain"
              onError={() => setError('Could not load this URL — make sure it\'s a direct image link')} />
          </div>
        )}

        <button onClick={handleSubmit}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-accent-marigold to-accent-coral text-white font-display text-lg shadow">
          Use this GIF 🎬
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          Want GIF search? Add{' '}
          <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_GIPHY_API_KEY</code>
          {' '}to .env.local
        </p>
      </div>
    </div>
  )
}

// ── GIPHY search picker (shown when NEXT_PUBLIC_GIPHY_API_KEY is set) ─────────
function GiphySearchPicker({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GiphyGif[]>([])
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string, off = 0) => {
    setLoading(true)
    try {
      const endpoint = q.trim()
        ? `${GIPHY_BASE}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=24&offset=${off}&rating=g`
        : `${GIPHY_BASE}/trending?api_key=${GIPHY_KEY}&limit=24&offset=${off}&rating=g`
      const res = await fetch(endpoint)
      const data = await res.json()
      const results: GiphyGif[] = data.data ?? []
      setGifs(prev => off > 0 ? [...prev, ...results] : results)
      setHasMore(results.length === 24)
      setOffset(off + results.length)
    } catch {
      // leave existing results
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    search('')
    inputRef.current?.focus()
  }, [search])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setOffset(0); search(query, 0) }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[82vh] flex flex-col overflow-hidden border-4 border-accent-marigold/20">
        <div className="flex items-center gap-3 p-4 border-b border-day-gold/20">
          <span className="text-2xl">🎬</span>
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder='Search GIFs… try "birthday" or "leo" 🦁'
            className="flex-1 px-3 py-2 rounded-xl border-2 border-day-gold/40 focus:border-accent-marigold focus:outline-none text-sm bg-day-cream/50" />
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-lg">✕</button>
        </div>
        <div className="px-4 pt-2 pb-1 flex items-center gap-1">
          {/* Powered by GIPHY */}
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Powered by</span>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">GIPHY</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading && gifs.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <span className="text-4xl animate-bounce">✨</span>
            </div>
          ) : gifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-sm">No GIFs found — try a different search!</p>
            </div>
          ) : (
            <>
              <div className="columns-3 gap-2 space-y-2">
                {gifs.map(gif => {
                  const preview = gif.images.fixed_height_small?.webp ?? gif.images.fixed_height_small?.url
                  const full = gif.images.fixed_height?.url
                  if (!preview || !full) return null
                  return (
                    <div key={gif.id} className="break-inside-avoid">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt={gif.title || 'GIF'}
                        className="w-full rounded-xl cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-150 border-2 border-transparent hover:border-accent-marigold"
                        onClick={() => { onSelect(full); onClose() }}
                        loading="lazy" />
                    </div>
                  )
                })}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-4 pb-2">
                  <button onClick={() => search(query, offset)} disabled={loading}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-accent-marigold to-accent-coral text-white text-sm font-semibold shadow disabled:opacity-50">
                    {loading ? '✨ Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GifPicker({ onSelect, onClose }: Props) {
  return GIPHY_KEY
    ? <GiphySearchPicker onSelect={onSelect} onClose={onClose} />
    : <UrlPastePicker onSelect={onSelect} onClose={onClose} />
}
