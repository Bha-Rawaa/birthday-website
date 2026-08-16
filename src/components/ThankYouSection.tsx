'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'
const PERSON_AGE  = process.env.NEXT_PUBLIC_PERSON_AGE ?? ''

interface Props {
  visitorName: string
}

function getCountdownTo(month: number, day: number) {
  const now = new Date()
  let target = new Date(now.getFullYear(), month - 1, day)
  if (now > target) target = new Date(now.getFullYear() + 1, month - 1, day)
  const diff = target.getTime() - now.getTime()
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    isToday: now.getMonth() + 1 === month && now.getDate() === day,
  }
}

function useGuestCount(visitorName: string) {
  const [count, setCount] = useState(1)

  useEffect(() => {
    if (!visitorName) return
    const channel = supabase.channel('party-guests', {
      config: { presence: { key: visitorName } },
    })
    channel.on('presence', { event: 'sync' }, () => {
      const keys = Object.keys(channel.presenceState())
      setCount(Math.max(1, keys.length))
    })
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ name: visitorName, joinedAt: Date.now() })
      }
    })
    return () => { supabase.removeChannel(channel) }
  }, [visitorName])

  return count
}

export default function ThankYouSection({ visitorName }: Props) {
  const ageLabel   = PERSON_AGE ? `${PERSON_AGE}th ` : ''
  const guestCount = useGuestCount(visitorName)
  const [countdown, setCountdown] = useState(getCountdownTo(8, 18))
  const tick = useCallback(() => setCountdown(getCountdownTo(8, 18)), [])
  useEffect(() => { const t = setInterval(tick, 1000); return () => clearInterval(t) }, [tick])

  const [personalMessage, setPersonalMessage] = useState<string | null>(null)
  useEffect(() => {
    if (!visitorName) return
    fetch(`/api/guest-message?name=${encodeURIComponent(visitorName)}`)
      .then(r => r.json())
      .then(d => setPersonalMessage(d.message ?? null))
      .catch(() => {})
  }, [visitorName])

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 py-24 overflow-hidden"
      style={{ background: 'transparent' }}
    >
      {/* Subtle star field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 80 }, (_, i) => (
          <div key={i} className="absolute rounded-full" style={{
            left: `${(i * 137.5) % 100}%`,
            top: `${(i * 97.3) % 100}%`,
            width: `${1 + (i % 3)}px`,
            height: `${1 + (i % 3)}px`,
            background: i % 5 === 0 ? '#C9A84C' : 'white',
            opacity: 0.06 + (i % 5) * 0.05,
            animation: `tyStar ${2 + (i % 4)}s ease-in-out ${(i % 7) * 0.4}s infinite`,
          }} />
        ))}
      </div>

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 35%, rgba(201,168,76,0.06) 0%, transparent 60%)',
      }} />

      {/* Rotating ring decoration */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width="900" height="900" viewBox="0 0 400 400"
          style={{ animation: 'tyRingRotate 60s linear infinite', opacity: 0.04 }}>
          {Array.from({ length: 36 }, (_, i) => (
            <line key={i} x1="200" y1="15" x2="200" y2="0"
              transform={`rotate(${i * 10}, 200, 200)`}
              stroke="#C9A84C" strokeWidth="1" strokeLinecap="round" />
          ))}
          <circle cx="200" cy="200" r="175" fill="none" stroke="#C9A84C" strokeWidth="0.4" />
          <circle cx="200" cy="200" r="155" fill="none" stroke="#C9A84C" strokeWidth="0.2" />
        </svg>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto w-full" style={{ animation: 'tyFadeUp 0.7s ease-out' }}>

        {/* Eyebrow */}
        <p style={{
          fontSize: 11, letterSpacing: '0.3em', color: 'rgba(201,168,76,0.6)',
          textTransform: 'uppercase', marginBottom: 16,
        }}>
          ✦ &nbsp; you are invited &nbsp; ✦
        </p>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(36px, 7vw, 68px)', fontWeight: 700,
          color: '#E8D5A3', letterSpacing: '-0.03em', lineHeight: 1.05,
          marginBottom: 6,
        }}>
          {PERSON_NAME}&apos;s
        </h1>
        <h2 style={{
          fontSize: 'clamp(20px, 4vw, 32px)', fontWeight: 400,
          color: 'rgba(232,213,163,0.55)', letterSpacing: '-0.01em',
          marginBottom: 32,
        }}>
          {ageLabel}Birthday &nbsp;·&nbsp; ♌
        </h2>

        {/* Live guest pill */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '8px 20px', borderRadius: 40,
            border: '1px solid rgba(201,168,76,0.2)',
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#C9A84C',
                boxShadow: '0 0 0 0 rgba(201,168,76,0.6)',
                animation: 'tyPing 1.5s ease-out infinite',
              }} />
            </span>
            <span style={{ color: 'rgba(232,213,163,0.7)', fontSize: 13 }}>
              {guestCount === 1
                ? 'Just you so far — fashionably early'
                : `${guestCount} guests celebrating right now`}
            </span>
          </div>
        </div>

        {/* Countdown */}
        {countdown.isToday ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 28px', borderRadius: 40,
            background: 'linear-gradient(135deg, #C9A84C, #E8D5A3)',
            color: '#0d0820', fontWeight: 700, fontSize: 16, marginBottom: 32,
            boxShadow: '0 8px 32px rgba(201,168,76,0.3)',
          }}>
            🎂 Today is the day! Happy Birthday {PERSON_NAME}!
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(201,168,76,0.12)',
            borderRadius: 16, padding: '20px 24px', marginBottom: 32,
          }}>
            <p style={{ color: 'rgba(201,168,76,0.5)', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 16 }}>
              August 18th — counting down
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { value: countdown.days,    label: 'Days'  },
                { value: countdown.hours,   label: 'Hours' },
                { value: countdown.minutes, label: 'Mins'  },
                { value: countdown.seconds, label: 'Secs'  },
              ].map(({ value, label }) => (
                <div key={label} style={{
                  background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.12)',
                  borderRadius: 12, padding: '12px 8px',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#E8D5A3', letterSpacing: '-0.02em' }}>
                    {String(value).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginTop: 4 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note card */}
        <div style={{
          textAlign: 'left',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: 18,
          padding: '2rem 2.5rem',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2))' }} />
            <span style={{ color: 'rgba(201,168,76,0.6)', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              A note from me
            </span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.2))' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {personalMessage ? (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
                {personalMessage}
              </p>
            ) : (
              <>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
                  {visitorName} — thank you for being here. Genuinely. Out of everything you could be doing right now, you chose to show up for me, and that means the world.
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
                  This is my {ageLabel}trip around the sun and I refused to let it go by quietly. So I built a whole party. On the internet. For us.
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
                  Scroll down and make yourself at home: leave a memory, blow the candles, cut the cake, and hit the dance floor. No dress code, no bedtime, no rules — just good vibes. 🎊
                </p>
              </>
            )}
          </div>

          <p style={{ color: 'rgba(201,168,76,0.5)', fontSize: 13, textAlign: 'right', marginTop: 20, marginBottom: 0, fontStyle: 'italic' }}>
            — {PERSON_NAME}, with love
          </p>
        </div>

        {/* Scroll cue */}
        <div style={{ color: 'rgba(201,168,76,0.4)', fontSize: 20, animation: 'tyBounce 2s ease-in-out infinite' }}>↓</div>
      </div>

      <style>{`
        @keyframes tyStar {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.35; }
        }
        @keyframes tyRingRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes tyFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tyPing {
          0% { box-shadow: 0 0 0 0 rgba(201,168,76,0.6); }
          70% { box-shadow: 0 0 0 8px rgba(201,168,76,0); }
          100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); }
        }
        @keyframes tyBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
      `}</style>
    </section>
  )
}
