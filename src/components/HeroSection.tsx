'use client'

import { useState, useEffect } from 'react'

interface Props {
  visitorName: string
}

function getCountdownTo(month: number, day: number) {
  const now = new Date()
  const thisYear = now.getFullYear()
  let target = new Date(thisYear, month - 1, day)
  if (now > target) target = new Date(thisYear + 1, month - 1, day)

  const diff = target.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds, diff }
}

function isBirthday(month: number, day: number) {
  const now = new Date()
  return now.getMonth() + 1 === month && now.getDate() === day
}

export default function HeroSection({ visitorName }: Props) {
  const [countdown, setCountdown] = useState(getCountdownTo(8, 18))
  const [isToday, setIsToday] = useState(isBirthday(8, 18))

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdownTo(8, 18))
      setIsToday(isBirthday(8, 18))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 py-20 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg width="800" height="800" className="animate-sunburst opacity-10" viewBox="0 0 400 400">
          {Array.from({ length: 36 }, (_, i) => (
            <line key={i} x1="200" y1="10" x2="200" y2="0"
              transform={`rotate(${i * 10}, 200, 200)`}
              stroke="#F4A93C" strokeWidth="3" strokeLinecap="round" />
          ))}
        </svg>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #FFE9A8 0%, transparent 70%)' }} />

      <div className="relative z-10 animate-fade-in-up">
        <div className="text-7xl mb-4">♌</div>

        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-accent-marigold mb-4 leading-tight drop-shadow-md">
          Hi {visitorName}! 🦁
        </h1>
        <p className="font-display text-2xl md:text-3xl text-day-orange mb-2">
          Welcome to [YOUR NAME]&apos;s Leo Season Celebration!
        </p>
        <p className="text-lg md:text-xl text-gray-600 mb-8">
          🎂 August 18th 🎂
        </p>

        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-xl border-2 border-accent-marigold/20 max-w-lg mx-auto">
          {isToday ? (
            <div className="text-center">
              <p className="font-display text-3xl text-accent-coral">🎉 It&apos;s my birthday today! 🎂</p>
              <p className="text-gray-600 mt-2">Today is the day — let&apos;s celebrate! 🦁✨</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4 font-semibold">
                {countdown.diff > 0 ? '🌟 Counting down to the big day...' : '🎉 Days since the celebration!'}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: Math.abs(countdown.days), label: 'Days' },
                  { value: countdown.hours, label: 'Hours' },
                  { value: countdown.minutes, label: 'Mins' },
                  { value: countdown.seconds, label: 'Secs' },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-gradient-to-b from-accent-marigold to-accent-coral rounded-2xl p-3 text-white shadow-md">
                    <div className="font-display text-3xl">{String(value).padStart(2, '0')}</div>
                    <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 animate-bounce text-accent-marigold text-3xl">↓</div>
      </div>
    </section>
  )
}
