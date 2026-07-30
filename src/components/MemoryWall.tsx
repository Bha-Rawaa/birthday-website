'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Memory } from '@/lib/types'

interface Props {
  refreshTrigger: number
}

const GIF_DELIMITER = '\n__GIF__:'

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
    month: 'short', day: 'numeric', year: 'numeric'
  })

  return (
    <div className="rounded-3xl overflow-hidden shadow-lg border border-day-peach/30 hover:shadow-xl transition-shadow duration-300"
      style={{ background: 'linear-gradient(135deg, #FFF9EF 0%, #FFC7A8 100%)' }}>
      {/* Uploaded photo (signed URL from private bucket) */}
      {signedUrl && (
        <div className="relative w-full h-48">
          <Image src={signedUrl} alt={`Memory from ${memory.name}`} fill className="object-cover" />
        </div>
      )}
      {/* GIF from Tenor */}
      {gifUrl && !signedUrl && (
        <div className="w-full bg-black/5 flex items-center justify-center overflow-hidden max-h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gifUrl} alt="GIF" className="w-full object-contain max-h-52" loading="lazy" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display text-lg text-accent-marigold">{memory.name}</h3>
          <span className="text-xs text-gray-400">{date}</span>
        </div>
        {text && <p className="text-gray-700 text-sm leading-relaxed">{text}</p>}
        {/* GIF shown below text if there's also a photo above */}
        {gifUrl && signedUrl && (
          <div className="mt-3 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gifUrl} alt="GIF" className="w-full object-contain max-h-40" loading="lazy" />
          </div>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl overflow-hidden border border-day-peach/30 animate-pulse"
      style={{ background: 'linear-gradient(135deg, #FFF9EF 0%, #FFC7A8 100%)' }}>
      <div className="h-48 bg-day-peach/40" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-day-gold/40 rounded-full w-1/3" />
        <div className="h-3 bg-day-gold/30 rounded-full w-full" />
        <div className="h-3 bg-day-gold/30 rounded-full w-4/5" />
      </div>
    </div>
  )
}

export default function MemoryWall({ refreshTrigger }: Props) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <section className="relative py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl md:text-5xl text-center mb-4" style={{ color: '#9B7FCC' }}>
          The Memory Wall 💛
        </h2>
        <p className="text-center mb-12 text-sm" style={{ color: '#8B7AAA' }}>
          Messages left with love from everyone who came to celebrate ✨
        </p>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🦁</div>
            <p className="font-display text-2xl" style={{ color: '#9B7FCC' }}>Be the first to leave a memory!</p>
            <p className="text-sm mt-2" style={{ color: '#8B7AAA' }}>Scroll up to add your message ↑</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memories.map(m => <MemoryCard key={m.id} memory={m} />)}
          </div>
        )}
      </div>
    </section>
  )
}
