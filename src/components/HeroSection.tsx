'use client'

import { useState, useEffect } from 'react'

const PERSON_NAME = process.env.NEXT_PUBLIC_PERSON_NAME ?? 'the birthday star'
const PERSON_AGE = process.env.NEXT_PUBLIC_PERSON_AGE ?? ''

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
  const ageLabel = PERSON_AGE ? `${PERSON_AGE}th ` : ''

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdownTo(8, 18))
      setIsToday(isBirthday(8, 18))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative py-20 px-4 overflow-hidden">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border-2 border-accent-marigold/20">
          <p className="font-display text-2xl md:text-3xl text-day-orange mb-4">
            {PERSON_NAME}&apos;s {ageLabel}Leo Season Celebration ♌
          </p>
          <p className="text-gray-500 mb-6 font-semibold">🎂 August 18th 🎂</p>

          {isToday ? (
            <div className="text-center">
              <p className="font-display text-3xl text-accent-coral">🎉 Today is the day! 🎂</p>
              <p className="text-gray-600 mt-2">
                It&apos;s {PERSON_NAME}&apos;s birthday — let&apos;s celebrate! 🦁✨
              </p>
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
      </div>
    </section>
  )
}
