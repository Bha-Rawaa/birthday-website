'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Memory } from '@/lib/types'

interface Props {
  refreshTrigger: number
}

const GIF_DELIMITER = '\n__GIF__:'
const CARD_W = 300
const CARD_GAP = 24
const CAROUSEL_THRESHOLD = 3

function parseMessage(raw: string): { text: string; gifUrl: string | null } {
  const idx = raw.indexOf(GIF_DELIMITER)
  if (idx === -1) return { text: raw, gifUrl: null }
  return { text: raw.slice(0, idx).trim(), gifUrl: raw.slice(idx + GIF_DELIMITER.length).trim() }
}

function MemoryCard({ memory }: { memory: Memory }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const { text, gifUrl } = parseMessage(memory.message ?? '')

  useEffect(() => {
    if (memory.photo_path) {
      supabase.storage.from('photos').createSignedUrl(memory.photo_path, 86400).then(({ data }) => {
        if (data) setSignedUrl(data.signedUrl)
      })
    }
  }, [memory.photo_path])

  const date = new Date(memory.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div
      className="rounded-2xl overflow-hidden transition-shadow duration-300 shrink-0"
      style={{
        width: CARD_W,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(201,168,76,0.12)',
      }}
    >
      {signedUrl && (
        <div className="relative w-full h-44">
          <Image src={signedUrl} alt={`Memory from ${memory.name}`} fill className="object-cover" />
        </div>
      )}
      {gifUrl && !signedUrl && (
        <div className="w-full bg-black/5 overflow-hidden max-h-48 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gifUrl} alt="GIF" className="w-full object-contain max-h-48" loading="lazy" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display text-base leading-tight" style={{ color: '#C9A84C' }}>{memory.name}</h3>
          <span className="text-xs ml-2 shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>{date}</span>
        </div>
        {text && <p className="text-sm leading-relaxed line-clamp-4" style={{ color: 'rgba(255,255,255,0.55)' }}>{text}</p>}
        {gifUrl && signedUrl && (
          <div className="mt-3 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gifUrl} alt="GIF" className="w-full object-contain max-h-36" loading="lazy" />
          </div>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse shrink-0"
      style={{ width: CARD_W, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.08)' }}>
      <div className="h-44" style={{ background: 'rgba(201,168,76,0.06)' }} />
      <div className="p-5 space-y-3">
        <div className="h-4 rounded-full w-1/3" style={{ background: 'rgba(201,168,76,0.15)' }} />
        <div className="h-3 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-3 rounded-full w-4/5" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  )
}

function MemoryCarousel({ memories }: { memories: Memory[] }) {
  const trackRef  = useRef<HTMLDivElement>(null)
  const rafRef    = useRef<number>(0)
  const offsetRef = useRef<number>(0)
  const pausedRef = useRef<boolean>(false)
  const SPEED     = 0.5
  const totalW    = memories.length * (CARD_W + CARD_GAP)

  useEffect(() => {
    const animate = () => {
      if (!pausedRef.current) {
        offsetRef.current += SPEED
        if (offsetRef.current >= totalW) offsetRef.current = 0
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [totalW])

  const pause  = () => { pausedRef.current = true }
  const resume = () => { pausedRef.current = false }

  // Duplicate for seamless loop
  const doubled = [...memories, ...memories]

  return (
    <div
      className="overflow-hidden w-full py-4 cursor-grab active:cursor-grabbing"
      onMouseEnter={pause} onMouseLeave={resume}
      onTouchStart={pause} onTouchEnd={resume}
    >
      {/* Fade edges */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, var(--tw-gradient-from, transparent), transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, var(--tw-gradient-from, transparent), transparent)' }} />
        <div
          ref={trackRef}
          className="flex"
          style={{ gap: CARD_GAP, willChange: 'transform', paddingLeft: 24, paddingRight: 24 }}
        >
          {doubled.map((m, i) => (
            <MemoryCard key={`${m.id}-${i}`} memory={m} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MemoryWall({ refreshTrigger }: Props) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading]   = useState(true)

  const fetchMemories = useCallback(async () => {
    const { data } = await supabase
      .from('memories')
      .select('*')
      .eq('is_public', true)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
    if (data) setMemories(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchMemories() }, [refreshTrigger, fetchMemories])

  const useCarousel = memories.length > CAROUSEL_THRESHOLD

  return (
    <section className="relative py-20 px-4" style={{ background: 'transparent' }}>
      <div className="max-w-5xl mx-auto mb-2">
        <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(155,127,204,0.6)', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>
          ✦ &nbsp; left with love &nbsp; ✦
        </p>
        <h2 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 10 }}>
          Memory Wall
        </h2>
        <p className="text-center mb-10 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Messages left with love from everyone who came to celebrate
        </p>
      </div>

      {loading ? (
        <div className="flex gap-6 justify-center px-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🦁</div>
          <p className="font-display text-2xl" style={{ color: '#9B7FCC' }}>Be the first to leave a memory!</p>
          <p className="text-sm mt-2" style={{ color: '#8B7AAA' }}>Scroll up to add your message ↑</p>
        </div>
      ) : useCarousel ? (
        <MemoryCarousel memories={memories} />
      ) : (
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memories.map(m => <MemoryCard key={m.id} memory={m} />)}
        </div>
      )}
    </section>
  )
}
