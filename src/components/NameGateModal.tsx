'use client'

import { useState, FormEvent, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'

interface Props {
  onSubmit: (name: string) => void
}

async function launchCelebrationFireworks() {
  const confetti = (await import('canvas-confetti')).default
  const colors = ['#C9A84C', '#E8D5A3', '#ffffff', '#9B7FCC', '#C9A84C']

  confetti({
    particleCount: 80,
    spread: 100,
    origin: { x: 0.5, y: 0.6 },
    colors,
    gravity: 0.8,
    scalar: 1.1,
    shapes: ['circle', 'square'],
  })

  setTimeout(() => {
    confetti({ particleCount: 40, angle: 60, spread: 70, origin: { x: 0 }, colors, gravity: 0.9 })
    confetti({ particleCount: 40, angle: 120, spread: 70, origin: { x: 1 }, colors, gravity: 0.9 })
  }, 300)

  setTimeout(() => {
    confetti({ particleCount: 60, spread: 120, origin: { x: 0.5, y: 0.5 }, colors, gravity: 0.7, scalar: 0.9 })
  }, 700)
}

export default function NameGateModal({ onSubmit }: Props) {
  const [name, setName] = useState('')
  const [word, setWord] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'form' | 'celebrating' | 'exiting'>('form')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/finale-song.mp3')
    audioRef.current.volume = 0.45
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!word.trim()) { setError('Please enter one word'); return }
    if (/\s/.test(word.trim())) { setError('Just one word, no spaces'); return }

    setLoading(true)
    setError('')

    try {
      await supabase.from('one_word_tags').insert({ word: word.trim().toLowerCase() })
      setPhase('celebrating')
      launchCelebrationFireworks()
      audioRef.current?.play().catch(() => {})
      setTimeout(() => setPhase('exiting'), 2800)
      setTimeout(() => onSubmit(name.trim()), 3200)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const stars = Array.from({ length: 60 }, (_, i) => ({
    left: `${(i * 137.5) % 100}%`,
    top: `${(i * 97.3) % 100}%`,
    size: 1 + (i % 3),
    opacity: 0.08 + (i % 5) * 0.06,
    duration: 2 + (i % 3),
    delay: (i % 7) * 0.4,
  }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #1a1040 0%, #080614 100%)',
        transition: 'opacity 0.5s ease',
        opacity: phase === 'exiting' ? 0 : 1,
      }}
    >
      {/* Star field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              background: 'white',
              opacity: s.opacity,
              animation: `ngTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Rotating ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width="700" height="700" viewBox="0 0 400 400" style={{ animation: 'ngSlowRotate 40s linear infinite', opacity: 0.05 }}>
          {Array.from({ length: 24 }, (_, i) => (
            <line key={i} x1="200" y1="20" x2="200" y2="0"
              transform={`rotate(${i * 15}, 200, 200)`}
              stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" />
          ))}
          <circle cx="200" cy="200" r="160" fill="none" stroke="#C9A84C" strokeWidth="0.5" />
        </svg>
      </div>

      {phase === 'form' && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 20,
          padding: '2.5rem',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)',
          animation: 'ngFadeUp 0.5s ease-out',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase', marginBottom: 12 }}>
              ✦ &nbsp; you are invited &nbsp; ✦
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 6 }}>
              {PERSON_NAME}&apos;s Birthday
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              Leo Season &nbsp;♌&nbsp; August 18th
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: 8 }}>
                Your name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name..."
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10,
                  border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(255,255,255,0.04)',
                  color: '#E8D5A3', fontSize: 15, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: 8 }}>
                One word to describe {PERSON_NAME}
              </label>
              <input
                type="text"
                value={word}
                onChange={e => setWord(e.target.value.replace(/\s/g, '').toLowerCase())}
                placeholder="e.g. radiant..."
                maxLength={30}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10,
                  border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(255,255,255,0.04)',
                  color: '#E8D5A3', fontSize: 15, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p style={{ color: '#E8856A', fontSize: 13, textAlign: 'center', margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8, padding: '14px 0', borderRadius: 10, border: 'none',
                background: loading ? 'rgba(201,168,76,0.25)' : 'linear-gradient(135deg, #C9A84C 0%, #E8D5A3 50%, #C9A84C 100%)',
                color: '#0d0820', fontWeight: 700, fontSize: 15, letterSpacing: '0.04em',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(201,168,76,0.25)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'A moment...' : "Let's celebrate →"}
            </button>
          </form>
        </div>
      )}

      {(phase === 'celebrating' || phase === 'exiting') && (
        <div style={{ textAlign: 'center', animation: 'ngFadeUp 0.6s ease-out' }}>
          <div style={{ fontSize: 64, marginBottom: 24, animation: 'ngCelebPulse 1.2s ease-in-out infinite' }}>♌</div>
          <p style={{ fontSize: 11, letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase', marginBottom: 16 }}>
            welcome to the party
          </p>
          <h2 style={{ fontSize: 38, fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em' }}>
            {name} ✨
          </h2>
          <p style={{ marginTop: 12, color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>
            So glad you&apos;re here
          </p>
        </div>
      )}

      <style>{`
        @keyframes ngTwinkle {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.45; }
        }
        @keyframes ngSlowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ngFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ngCelebPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
      `}</style>
    </div>
  )
}
