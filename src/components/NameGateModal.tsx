'use client'

import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  onSubmit: (name: string) => void
}

export default function NameGateModal({ onSubmit }: Props) {
  const [name, setName] = useState('')
  const [word, setWord] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name 🌻'); return }
    if (!word.trim()) { setError('Please enter one word 🦁'); return }
    if (/\s/.test(word.trim())) { setError('Just one word, no spaces! 🦁'); return }

    setLoading(true)
    setError('')

    try {
      await supabase.from('one_word_tags').insert({ word: word.trim().toLowerCase() })
      setClosing(true)
      setTimeout(() => onSubmit(name.trim()), 400)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-day-yellow via-day-peach to-day-orange backdrop-blur-sm ${closing ? 'animate-fade-zoom-out' : 'animate-fade-in-up'}`}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <svg width="600" height="600" className="animate-sunburst opacity-20" viewBox="0 0 200 200">
          {Array.from({ length: 24 }, (_, i) => (
            <line key={i} x1="100" y1="5" x2="100" y2="0"
              transform={`rotate(${i * 15}, 100, 100)`}
              stroke="#F4A93C" strokeWidth="2" strokeLinecap="round" />
          ))}
          <circle cx="100" cy="100" r="40" fill="none" stroke="#F4A93C" strokeWidth="1" opacity="0.5" />
        </svg>
      </div>

      <div className="relative bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md border-4 border-accent-marigold/30">
        <div className="text-center mb-2">
          <span className="text-5xl">♌</span>
        </div>
        <h1 className="font-display text-3xl text-center text-accent-marigold mb-2">
          Welcome! 🦁
        </h1>
        <p className="text-center text-gray-600 mb-6 text-sm">
          You&apos;re invited to celebrate [YOUR NAME]&apos;s Leo season birthday!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              What&apos;s your name? 🌻
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name..."
              className="w-full px-4 py-3 rounded-2xl border-2 border-day-gold/50 focus:border-accent-marigold focus:outline-none bg-day-cream/50 text-gray-800 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              In one word, describe [YOUR NAME]: 🦁
            </label>
            <input
              type="text"
              value={word}
              onChange={e => setWord(e.target.value.replace(/\s/g, '').toLowerCase())}
              placeholder="One word..."
              maxLength={30}
              className="w-full px-4 py-3 rounded-2xl border-2 border-day-gold/50 focus:border-accent-marigold focus:outline-none bg-day-cream/50 text-gray-800 placeholder-gray-400"
            />
          </div>

          {error && (
            <p className="text-accent-coral text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-accent-marigold to-accent-coral text-white font-display text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Entering... ✨' : "Let's Celebrate! 🎉"}
          </button>
        </form>
      </div>
    </div>
  )
}
