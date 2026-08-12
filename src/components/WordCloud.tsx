'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { WordTag } from '@/lib/types'

const PASTEL_COLORS = [
  '#F4A93C', '#F0654E', '#FFB08A', '#FFC7A8', '#F6D486',
  '#9B59B6', '#3498DB', '#2ECC71', '#E74C3C', '#1ABC9C',
]

const FONT_SIZES = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl']

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

export default function WordCloud() {
  const [words, setWords] = useState<WordTag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWords = async () => {
      const { data } = await supabase.from('one_word_tags').select('*').order('created_at', { ascending: false })
      if (data) setWords(data)
      setLoading(false)
    }
    fetchWords()
    const interval = setInterval(fetchWords, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative py-20 px-4" style={{ background: 'transparent' }}>
      <div className="max-w-4xl mx-auto">
        <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>
          ✦ &nbsp; in their words &nbsp; ✦
        </p>
        <h2 style={{ fontSize: 'clamp(24px,4vw,44px)', fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 10 }}>
          In one word, she is...
        </h2>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', marginBottom: 48, fontSize: 14 }}>
          Words from everyone who visited this page
        </p>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-pulse text-4xl">✨</div>
          </div>
        ) : words.length === 0 ? (
          <p className="text-center text-gray-500">Be the first to add a word! 🦁</p>
        ) : (
          <div className="flex flex-wrap gap-4 justify-center items-center min-h-48">
            {words.map((tag, i) => {
              const colorIdx = Math.floor(seededRand(i * 7) * PASTEL_COLORS.length)
              const sizeIdx = Math.floor(seededRand(i * 13) * FONT_SIZES.length)
              const delay = seededRand(i * 3) * 3
              const duration = 3 + seededRand(i * 5) * 3

              return (
                <span
                  key={tag.id}
                  className={`font-display ${FONT_SIZES[sizeIdx]} animate-drift cursor-default select-none hover:scale-110 transition-transform`}
                  style={{
                    color: PASTEL_COLORS[colorIdx],
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`,
                    textShadow: `0 2px 4px ${PASTEL_COLORS[colorIdx]}40`,
                  }}
                >
                  {tag.word}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
